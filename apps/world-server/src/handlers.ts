/**
 * Handlers de protocolo del world-server: registro de conexión WS, router de mensajes y
 * lógica de dominio (hello/input/chat/voz/bye/close). Reciben el `World` por inyección, así
 * que son testeables sin levantar el socket. Separados del transporte y el loop (§1.1-S).
 */

import { randomUUID } from 'node:crypto';
import { WebSocket } from 'ws';
import type { IncomingMessage } from 'node:http';
import {
  C2S,
  S2C,
  ErrorCode,
  normalizeChat,
  PROTOCOL_VERSION,
  TICK_HZ,
  HELLO_TIMEOUT_MS,
  RECONNECT_GRACE_MS,
  MAX_VOICE_PAYLOAD_BYTES,
  MAX_QUEUED_INPUTS,
  MAX_INPUT_DT_S,
  decode,
  type EntityId,
  type C2SMessage,
  type HelloMsg,
  type InputMsg,
  type ChatSendMsg,
  type VoiceSignalMsg,
  type VoiceStateMsg,
} from '@osia/shared';
import { log } from './logger';
import { verifyTicket } from './ticket';
import { TokenBucket } from './rateLimit';
import { send, broadcastAll, broadcastExcept } from './send';
import { originAllowed } from './http';
import type { Conn, World } from './state';

const voiceEnc = new TextEncoder(); // medir el tamaño en bytes del payload de voz (validación)

// Token bucket de chat por conexión: ráfaga de 4, luego 1 token cada 2 s.
const CHAT_CAP = 4;
const CHAT_REFILL_MS = 2000;
// Token bucket de voz por conexión (signaling): ráfaga alta para la tormenta de conexión
// inicial (offer + trickle ICE a varios pares), luego ~50/s sostenido. El flood se descarta.
const VOICE_CAP = 100;
const VOICE_REFILL_MS = 20;

/** Registra una conexión WS entrante: gate de Origin, alta del Conn y wiring de eventos. */
export function registerConnection(world: World, ws: WebSocket, req: IncomingMessage): void {
  // §8: la allowlist no debe ser eludible omitiendo el header Origin (rechazado en prod).
  if (!originAllowed(req.headers.origin)) {
    send(ws, { op: S2C.ERROR, code: ErrorCode.BAD_MESSAGE, message: 'origin no permitido' });
    ws.close();
    return;
  }
  const conn: Conn = { ws, entityId: null, lastSeen: Date.now() };
  world.conns.add(conn);
  // HELLO_TIMEOUT (docs/05 §2.1): un socket que no se autentica a tiempo se cierra.
  conn.helloTimer = setTimeout(() => {
    if (conn.entityId === null) {
      send(ws, { op: S2C.ERROR, code: ErrorCode.TIMEOUT, message: 'esperaba HELLO' });
      ws.close();
    }
  }, HELLO_TIMEOUT_MS);
  ws.on('message', (data: Buffer) => {
    conn.lastSeen = Date.now();
    void onMessage(world, conn, data);
  }); // frames binarios
  ws.on('pong', () => {
    conn.lastSeen = Date.now();
  });
  ws.on('close', () => onClose(world, conn));
  ws.on('error', () => onClose(world, conn));
}

/** Limpia el temporizador de HELLO una vez la conexión se autenticó (alta o resume). */
function clearHelloTimer(conn: Conn): void {
  if (conn.helloTimer) {
    clearTimeout(conn.helloTimer);
    conn.helloTimer = undefined;
  }
}

function spawnPoint(i: number): { x: number; z: number } {
  const a = i * 1.2;
  return { x: Math.cos(a) * 2, z: 6 + Math.sin(a) * 2 };
}

async function onMessage(world: World, conn: Conn, raw: Uint8Array): Promise<void> {
  const msg = decode<C2SMessage>(raw);
  if (!msg)
    return void send(conn.ws, { op: S2C.ERROR, code: ErrorCode.BAD_MESSAGE, message: 'mensaje inválido' });
  if (conn.entityId === null && msg.op !== C2S.HELLO) {
    return void send(conn.ws, { op: S2C.ERROR, code: ErrorCode.BAD_MESSAGE, message: 'esperaba HELLO' });
  }
  switch (msg.op) {
    case C2S.HELLO:
      await onHello(world, conn, msg);
      break;
    case C2S.INPUT:
      onInput(world, conn, msg);
      break;
    case C2S.PING:
      send(conn.ws, { op: S2C.PONG, t: msg.t, serverTime: Date.now() });
      break;
    case C2S.CHAT_SEND:
      onChat(world, conn, msg);
      break;
    case C2S.VOICE_SIGNAL:
      onVoiceSignal(world, conn, msg);
      break;
    case C2S.VOICE_STATE:
      onVoiceState(world, conn, msg);
      break;
    case C2S.BYE:
      onBye(world, conn);
      break;
    default:
      break;
  }
}

async function onHello(world: World, conn: Conn, msg: HelloMsg): Promise<void> {
  if (conn.entityId !== null) return;
  if (msg.protocol !== PROTOCOL_VERSION) {
    send(conn.ws, { op: S2C.ERROR, code: ErrorCode.PROTOCOL_MISMATCH, message: 'protocolo' });
    return void conn.ws.close();
  }
  const { hub, director } = world;
  // RECONEXIÓN: el resumeToken es un secreto del server (randomUUID) que ya prueba identidad.
  // Se re-adopta SÍNCRONO (sin await previo) → no hay carrera con el grace timer (otra macrotarea).
  if (msg.resumeToken) {
    const prev = [...hub.entities.values()].find(
      (e) => e.disconnected && e.token === msg.resumeToken,
    );
    if (prev) {
      const timer = world.graceTimers.get(prev.state.id);
      if (timer) clearTimeout(timer);
      world.graceTimers.delete(prev.state.id);
      prev.disconnected = false;
      prev.inputs.length = 0;
      conn.entityId = prev.state.id;
      clearHelloTimer(conn); // autenticado por resume
      world.peers.set(prev.state.id, conn); // re-ruteo de voz a la nueva conexión
      send(conn.ws, {
        op: S2C.WELCOME,
        selfId: prev.state.id,
        instanceId: hub.id,
        protocol: PROTOCOL_VERSION,
        tickHz: TICK_HZ,
        entities: hub.snapshot(),
        atmosphere: { biome: director.biome, weather: director.weather },
        serverTime: Date.now(),
        resumeToken: prev.token,
      });
      sendVoiceSnapshot(world, conn); // estado de voz de los demás (después del WELCOME)
      log.info({ id: prev.state.id }, 'resume');
      return;
    }
  }

  // ALTA NUEVA: requiere ticket válido.
  let handle: string;
  try {
    handle = (await verifyTicket(msg.ticket)).handle;
  } catch {
    send(conn.ws, { op: S2C.ERROR, code: ErrorCode.BAD_TICKET, message: 'ticket inválido' });
    return void conn.ws.close();
  }

  if (hub.full) {
    send(conn.ws, { op: S2C.ERROR, code: ErrorCode.INSTANCE_FULL, message: 'instancia llena' });
    return void conn.ws.close();
  }

  const id = world.mintId();
  conn.entityId = id;
  clearHelloTimer(conn); // autenticado por ticket válido
  world.peers.set(id, conn);
  const token = randomUUID();
  const rt = hub.add(id, handle, spawnPoint(hub.entities.size), token);

  send(conn.ws, {
    op: S2C.WELCOME,
    selfId: id,
    instanceId: hub.id,
    protocol: PROTOCOL_VERSION,
    tickHz: TICK_HZ,
    entities: hub.snapshot(),
    atmosphere: { biome: director.biome, weather: director.weather }, // sync de clima al entrar
    serverTime: Date.now(), // sincroniza el reloj día/noche
    resumeToken: token,
  });
  sendVoiceSnapshot(world, conn); // estado de voz de los demás (después del WELCOME)
  broadcastExcept(world.conns, conn, { op: S2C.ENTITY_JOIN, entity: { ...rt.state } });
  log.info({ id, handle, players: hub.entities.size }, 'join');
}

/** Sincroniza al recién llegado el estado de voz (mic/hablando) de los demás. Llamar TRAS el WELCOME. */
function sendVoiceSnapshot(world: World, conn: Conn): void {
  for (const e of world.hub.entities.values()) {
    if (e.state.id !== conn.entityId && e.voiceFlags) {
      send(conn.ws, { op: S2C.VOICE_STATE, id: e.state.id, flags: e.voiceFlags });
    }
  }
}

function onInput(world: World, conn: Conn, msg: InputMsg): void {
  if (conn.entityId === null) return;
  const rt = world.hub.entities.get(conn.entityId);
  if (!rt) return;
  if (msg.seq <= rt.lastSeq || rt.inputs.length > MAX_QUEUED_INPUTS) return; // viejo/duplicado o flood
  const inputDt = Math.min(MAX_INPUT_DT_S, Math.max(0, msg.dtMs / 1000)); // clamp anti-cheat
  rt.inputs.push({ seq: msg.seq, f: msg.f, r: msg.r, yaw: msg.yaw, dt: inputDt });
}

function takeChatToken(conn: Conn): boolean {
  conn.chat ??= new TokenBucket(CHAT_CAP, CHAT_REFILL_MS, Date.now());
  return conn.chat.take(Date.now());
}

function onChat(world: World, conn: Conn, msg: ChatSendMsg): void {
  if (conn.entityId === null) return;
  const rt = world.hub.entities.get(conn.entityId);
  if (!rt) return;
  if (!takeChatToken(conn)) {
    return void send(conn.ws, { op: S2C.ERROR, code: ErrorCode.RATE_LIMIT, message: 'demasiados mensajes' });
  }
  const text = normalizeChat(msg.text); // mismo saneo que el cliente (autoridad)
  if (text) broadcastAll(world.conns, { op: S2C.CHAT_MSG, id: rt.state.id, handle: rt.state.handle, text });
}

function takeVoiceToken(conn: Conn): boolean {
  conn.voiceBucket ??= new TokenBucket(VOICE_CAP, VOICE_REFILL_MS, Date.now());
  return conn.voiceBucket.take(Date.now());
}

/** Relay BYTE-CIEGO del signaling de voz: jamás parsea el SDP/ICE; inyecta srcId (anti-spoof). */
function onVoiceSignal(world: World, conn: Conn, msg: VoiceSignalMsg): void {
  if (conn.entityId === null) return;
  if (msg.dstId === conn.entityId) return; // no a sí mismo
  // El `kind` ya viene validado por el codec (decode rechaza kinds fuera de VOICE_SIGNAL_KIND);
  // aquí solo el tope de tamaño del payload (anti amplificación/DoS).
  if (voiceEnc.encode(msg.payload).length > MAX_VOICE_PAYLOAD_BYTES) return;
  const dst = world.peers.get(msg.dstId); // misma instancia (en F0 sólo existe el hub)
  if (!dst || dst.ws.readyState !== WebSocket.OPEN) return; // destino ausente → descartar (sin gastar token)
  if (!takeVoiceToken(conn)) return; // flood de relays VÁLIDOS → descartar en silencio
  send(dst.ws, { op: S2C.VOICE_SIGNAL, srcId: conn.entityId, kind: msg.kind, payload: msg.payload });
}

/** Difunde el estado de voz (mic/hablando/sordo) al resto del hub y lo persiste para sync. */
function onVoiceState(world: World, conn: Conn, msg: VoiceStateMsg): void {
  if (conn.entityId === null) return;
  if (!takeVoiceToken(conn)) return;
  const flags = msg.flags & 0x07;
  const rt = world.hub.entities.get(conn.entityId);
  if (rt) rt.voiceFlags = flags; // persistido → sincronizar al que entre después
  broadcastExcept(world.conns, conn, { op: S2C.VOICE_STATE, id: conn.entityId, flags });
}

function dropEntity(world: World, id: EntityId): void {
  world.graceTimers.delete(id);
  const rt = world.hub.entities.get(id);
  if (!rt || !rt.disconnected) return; // ya re-adoptada por un resume → no borrar
  world.hub.remove(id);
  broadcastAll(world.conns, { op: S2C.ENTITY_LEAVE, id });
  log.info({ id, players: world.hub.entities.size }, 'leave');
}

/** Salida LIMPIA (BYE): a diferencia de una caída de red, NO espera la gracia —
 *  remueve la entidad y avisa `ENTITY_LEAVE` de inmediato (docs/05 §2.2). */
function onBye(world: World, conn: Conn): void {
  const id = conn.entityId;
  conn.entityId = null; // onClose no debe re-procesarlo ni meterlo en gracia
  if (id !== null) {
    const timer = world.graceTimers.get(id);
    if (timer) clearTimeout(timer);
    world.graceTimers.delete(id);
    world.peers.delete(id);
    if (world.hub.entities.has(id)) {
      world.hub.remove(id);
      broadcastAll(world.conns, { op: S2C.ENTITY_LEAVE, id });
      log.info({ id, players: world.hub.entities.size }, 'leave (bye)');
    }
  }
  conn.ws.close();
}

function onClose(world: World, conn: Conn): void {
  if (!world.conns.has(conn)) return;
  world.conns.delete(conn);
  clearHelloTimer(conn);
  if (conn.entityId === null) return;
  const id = conn.entityId;
  conn.entityId = null;
  world.peers.delete(id); // se corta el ruteo de voz; al hacer resume se vuelve a setear
  const rt = world.hub.entities.get(id);
  if (!rt) return;
  // Grace window: NO se borra de inmediato — se espera una posible reconexión (resume).
  rt.disconnected = true;
  rt.inputs.length = 0; // que no siga "moviéndose" con inputs viejos
  world.graceTimers.set(
    id,
    setTimeout(() => dropEntity(world, id), RECONNECT_GRACE_MS),
  );
  log.info({ id }, 'disconnect (grace)');
}
