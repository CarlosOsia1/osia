/**
 * world-server (OSIA-S0.4) — servidor AUTORITATIVO del mundo.
 *
 * - HTTP: emite world tickets (HS256) y /health.
 * - WS (ws; swappable a uWebSockets.js en prod): HELLO→WELCOME con ticket,
 *   rooms/instancia Hub, join/leave, INPUT→cola, CHAT, PING/PONG.
 * - Loop de tick fijo a 20 Hz: drena el último input por entidad, aplica el
 *   MISMO applyMovement de @osia/shared (anti-cheat por autoridad) y difunde DELTA.
 *
 * El cliente NUNCA envía posiciones, solo intención (f, r, yaw).
 */

import { createServer, type ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import { WebSocketServer, WebSocket } from 'ws';
import {
  encode,
  decode,
  C2S,
  S2C,
  ErrorCode,
  normalizeChat,
  normalizeHandle,
  PROTOCOL_VERSION,
  TICK_HZ,
  TICK_MS,
  PING_INTERVAL_MS,
  CONNECTION_TIMEOUT_MS,
  HELLO_TIMEOUT_MS,
  RECONNECT_GRACE_MS,
  MAX_VOICE_PAYLOAD_BYTES,
  asEntityId,
  type EntityId,
  type C2SMessage,
  type S2CMessage,
  type HelloMsg,
  type InputMsg,
  type ChatSendMsg,
  type VoiceSignalMsg,
  type VoiceStateMsg,
} from '@osia/shared';
import { config } from './config';
import { log } from './logger';
import { issueTicket, verifyTicket } from './ticket';
import { Instance } from './instance';
import { WeatherDirector } from './weather';
import { TokenBucket, KeyedRateLimiter } from './rateLimit';
import { TickMetrics } from './metrics';

const hub = new Instance('hub');
const director = new WeatherDirector(config.biome, Date.now, config.worldSeed); // clima autoritativo + determinista
const metrics = new TickMetrics();
let nextEntityId = 1;
const voiceEnc = new TextEncoder(); // medir el tamaño en bytes del payload de voz (validación)

type Conn = {
  ws: WebSocket;
  entityId: EntityId | null;
  lastSeen: number; // último instante con señal del cliente (pong/mensaje) → timeout de heartbeat
  helloTimer?: ReturnType<typeof setTimeout>; // cierra el socket si no llega HELLO a tiempo
  chat?: TokenBucket; // anti-spam de chat (creado al primer mensaje)
  voiceBucket?: TokenBucket; // anti-flood del signaling de voz
};
const conns = new Set<Conn>();
const peers = new Map<EntityId, Conn>(); // entityId → conn (ruteo O(1) del signaling de voz)

/** Limpia el temporizador de HELLO una vez la conexión se autenticó (alta o resume). */
function clearHelloTimer(conn: Conn): void {
  if (conn.helloTimer) {
    clearTimeout(conn.helloTimer);
    conn.helloTimer = undefined;
  }
}

// Rate-limit de emisión de tickets por IP (anti-flood): ~20 por minuto.
const ticketLimiter = new KeyedRateLimiter(20, 3000);
const GRACE_MS = RECONNECT_GRACE_MS; // ventana de reconexión: la entidad se conserva tras una caída
const graceTimers = new Map<number, ReturnType<typeof setTimeout>>();

// ---------- HTTP (tickets + health) ----------
function setCors(res: ServerResponse, origin: string | undefined): void {
  if (origin && config.corsOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
}

const httpServer = createServer((req, res) => {
  setCors(res, req.headers.origin);
  if (req.method === 'OPTIONS') return void res.writeHead(204).end();

  if (req.method === 'GET' && req.url === '/health') {
    return void res
      .writeHead(200, { 'content-type': 'application/json' })
      .end(JSON.stringify({ ok: true, players: hub.entities.size, metrics: metrics.snapshot() }));
  }

  if (req.method === 'POST' && req.url === '/world/tickets') {
    const ip = req.socket.remoteAddress ?? 'unknown';
    if (!ticketLimiter.take(ip, Date.now())) {
      return void res
        .writeHead(429, { 'content-type': 'application/json' })
        .end(JSON.stringify({ error: 'rate_limit' }));
    }
    let body = '';
    req.on('data', (c: Buffer) => {
      body += c;
      if (body.length > 4096) req.destroy();
    });
    req.on('end', () => {
      void (async () => {
        try {
          const parsed = JSON.parse(body || '{}') as { worldId?: string; handle?: string };
          const handle = normalizeHandle(parsed.handle ?? ''); // saneo (anti-spoof RTL/zero-width)
          const worldId = String(parsed.worldId ?? 'osia');
          const ticket = await issueTicket(handle, worldId);
          res
            .writeHead(200, { 'content-type': 'application/json' })
            .end(JSON.stringify({ ticket, wsUrl: config.publicWsUrl }));
        } catch {
          res
            .writeHead(400, { 'content-type': 'application/json' })
            .end(JSON.stringify({ error: 'bad_request' }));
        }
      })();
    });
    return;
  }

  res.writeHead(404).end();
});

// ---------- WebSocket ----------
const wss = new WebSocketServer({ server: httpServer, path: '/world', maxPayload: 64 * 1024 }); // holgura para SDP

wss.on('connection', (ws, req) => {
  const origin = req.headers.origin;
  if (origin && !config.corsOrigins.includes(origin)) {
    send(ws, { op: S2C.ERROR, code: ErrorCode.BAD_MESSAGE, message: 'origin no permitido' });
    ws.close();
    return;
  }
  const conn: Conn = { ws, entityId: null, lastSeen: Date.now() };
  conns.add(conn);
  // HELLO_TIMEOUT (docs/05 §2.1): un socket que no se autentica a tiempo se cierra.
  conn.helloTimer = setTimeout(() => {
    if (conn.entityId === null) {
      send(ws, { op: S2C.ERROR, code: ErrorCode.TIMEOUT, message: 'esperaba HELLO' });
      ws.close();
    }
  }, HELLO_TIMEOUT_MS);
  ws.on('message', (data: Buffer) => {
    conn.lastSeen = Date.now();
    void onMessage(conn, data);
  }); // frames binarios
  ws.on('pong', () => {
    conn.lastSeen = Date.now();
  });
  ws.on('close', () => onClose(conn));
  ws.on('error', () => onClose(conn));
});

async function onMessage(conn: Conn, raw: Uint8Array): Promise<void> {
  const msg = decode<C2SMessage>(raw);
  if (!msg)
    return void send(conn.ws, {
      op: S2C.ERROR,
      code: ErrorCode.BAD_MESSAGE,
      message: 'mensaje inválido',
    });
  if (conn.entityId === null && msg.op !== C2S.HELLO) {
    return void send(conn.ws, {
      op: S2C.ERROR,
      code: ErrorCode.BAD_MESSAGE,
      message: 'esperaba HELLO',
    });
  }
  switch (msg.op) {
    case C2S.HELLO:
      await onHello(conn, msg);
      break;
    case C2S.INPUT:
      onInput(conn, msg);
      break;
    case C2S.PING:
      send(conn.ws, { op: S2C.PONG, t: msg.t, serverTime: Date.now() });
      break;
    case C2S.CHAT_SEND:
      onChat(conn, msg);
      break;
    case C2S.VOICE_SIGNAL:
      onVoiceSignal(conn, msg);
      break;
    case C2S.VOICE_STATE:
      onVoiceState(conn, msg);
      break;
    case C2S.BYE:
      onBye(conn);
      break;
    default:
      break;
  }
}

async function onHello(conn: Conn, msg: HelloMsg): Promise<void> {
  if (conn.entityId !== null) return;
  if (msg.protocol !== PROTOCOL_VERSION) {
    send(conn.ws, { op: S2C.ERROR, code: ErrorCode.PROTOCOL_MISMATCH, message: 'protocolo' });
    return void conn.ws.close();
  }
  // RECONEXIÓN: el resumeToken es un secreto del server (randomUUID) que ya prueba identidad.
  // Se re-adopta SÍNCRONO (sin await previo) → no hay carrera con el grace timer (otra macrotarea).
  if (msg.resumeToken) {
    const prev = [...hub.entities.values()].find(
      (e) => e.disconnected && e.token === msg.resumeToken,
    );
    if (prev) {
      const timer = graceTimers.get(prev.state.id);
      if (timer) clearTimeout(timer);
      graceTimers.delete(prev.state.id);
      prev.disconnected = false;
      prev.inputs.length = 0;
      conn.entityId = prev.state.id;
      clearHelloTimer(conn); // autenticado por resume
      peers.set(prev.state.id, conn); // re-ruteo de voz a la nueva conexión
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
      sendVoiceSnapshot(conn); // estado de voz de los demás (después del WELCOME)
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

  const id = asEntityId(nextEntityId++);
  conn.entityId = id;
  clearHelloTimer(conn); // autenticado por ticket válido
  peers.set(id, conn);
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
  sendVoiceSnapshot(conn); // estado de voz de los demás (después del WELCOME)
  broadcastExcept(conn, { op: S2C.ENTITY_JOIN, entity: { ...rt.state } });
  log.info({ id, handle, players: hub.entities.size }, 'join');
}

/** Sincroniza al recién llegado el estado de voz (mic/hablando) de los demás. Llamar TRAS el WELCOME. */
function sendVoiceSnapshot(conn: Conn): void {
  for (const e of hub.entities.values()) {
    if (e.state.id !== conn.entityId && e.voiceFlags) {
      send(conn.ws, { op: S2C.VOICE_STATE, id: e.state.id, flags: e.voiceFlags });
    }
  }
}

function onInput(conn: Conn, msg: InputMsg): void {
  if (conn.entityId === null) return;
  const rt = hub.entities.get(conn.entityId);
  if (!rt) return;
  if (msg.seq <= rt.lastSeq || rt.inputs.length > 120) return; // viejo/duplicado o flood
  const inputDt = Math.min(0.1, Math.max(0, msg.dtMs / 1000)); // clamp anti-cheat
  rt.inputs.push({ seq: msg.seq, f: msg.f, r: msg.r, yaw: msg.yaw, dt: inputDt });
}

// Token bucket de chat por conexión: ráfaga de 4, luego 1 token cada 2 s.
const CHAT_CAP = 4;
const CHAT_REFILL_MS = 2000;
function takeChatToken(conn: Conn): boolean {
  conn.chat ??= new TokenBucket(CHAT_CAP, CHAT_REFILL_MS, Date.now());
  return conn.chat.take(Date.now());
}

function onChat(conn: Conn, msg: ChatSendMsg): void {
  if (conn.entityId === null) return;
  const rt = hub.entities.get(conn.entityId);
  if (!rt) return;
  if (!takeChatToken(conn)) {
    return void send(conn.ws, {
      op: S2C.ERROR,
      code: ErrorCode.RATE_LIMIT,
      message: 'demasiados mensajes',
    });
  }
  const text = normalizeChat(msg.text); // mismo saneo que el cliente (autoridad)
  if (text) broadcastAll({ op: S2C.CHAT_MSG, id: rt.state.id, handle: rt.state.handle, text });
}

// Token bucket de voz por conexión (signaling): ráfaga alta para la tormenta de
// conexión inicial (offer + trickle ICE a varios pares), luego ~50/s sostenido.
// Un flood se corta sin tirar la conexión (descartar en silencio).
const VOICE_CAP = 100;
const VOICE_REFILL_MS = 20; // ~50 tokens/s
function takeVoiceToken(conn: Conn): boolean {
  conn.voiceBucket ??= new TokenBucket(VOICE_CAP, VOICE_REFILL_MS, Date.now());
  return conn.voiceBucket.take(Date.now());
}

/** Relay BYTE-CIEGO del signaling de voz: jamás parsea el SDP/ICE; inyecta srcId (anti-spoof). */
function onVoiceSignal(conn: Conn, msg: VoiceSignalMsg): void {
  if (conn.entityId === null) return;
  if (msg.dstId === conn.entityId) return; // no a sí mismo
  // Validación de contrato (SHD-04): kind acotado (0=offer 1=answer 2=ice 3=ice-end) y payload
  // con tope de tamaño → evita amplificación/DoS vía el relay aunque el SDP no se inspeccione.
  if (msg.kind > 3 || voiceEnc.encode(msg.payload).length > MAX_VOICE_PAYLOAD_BYTES) return;
  const dst = peers.get(msg.dstId); // misma instancia (en F0 sólo existe el hub)
  if (!dst || dst.ws.readyState !== WebSocket.OPEN) return; // destino ausente → descartar (sin gastar token)
  if (!takeVoiceToken(conn)) return; // flood de relays VÁLIDOS → descartar en silencio
  send(dst.ws, {
    op: S2C.VOICE_SIGNAL,
    srcId: conn.entityId,
    kind: msg.kind,
    payload: msg.payload,
  });
}

/** Difunde el estado de voz (mic/hablando/sordo) al resto del hub y lo persiste para sync. */
function onVoiceState(conn: Conn, msg: VoiceStateMsg): void {
  if (conn.entityId === null) return;
  if (!takeVoiceToken(conn)) return;
  const flags = msg.flags & 0x07;
  const rt = hub.entities.get(conn.entityId);
  if (rt) rt.voiceFlags = flags; // persistido → sincronizar al que entre después
  broadcastExcept(conn, { op: S2C.VOICE_STATE, id: conn.entityId, flags });
}

function dropEntity(id: EntityId): void {
  graceTimers.delete(id);
  const rt = hub.entities.get(id);
  if (!rt || !rt.disconnected) return; // ya re-adoptada por un resume → no borrar
  hub.remove(id);
  broadcastAll({ op: S2C.ENTITY_LEAVE, id });
  log.info({ id, players: hub.entities.size }, 'leave');
}

/** Salida LIMPIA (BYE): a diferencia de una caída de red, NO espera la gracia —
 *  remueve la entidad y avisa `ENTITY_LEAVE` de inmediato (docs/05 §2.2). */
function onBye(conn: Conn): void {
  const id = conn.entityId;
  conn.entityId = null; // onClose no debe re-procesarlo ni meterlo en gracia
  if (id !== null) {
    const timer = graceTimers.get(id);
    if (timer) clearTimeout(timer);
    graceTimers.delete(id);
    peers.delete(id);
    if (hub.entities.has(id)) {
      hub.remove(id);
      broadcastAll({ op: S2C.ENTITY_LEAVE, id });
      log.info({ id, players: hub.entities.size }, 'leave (bye)');
    }
  }
  conn.ws.close();
}

function onClose(conn: Conn): void {
  if (!conns.has(conn)) return;
  conns.delete(conn);
  clearHelloTimer(conn);
  if (conn.entityId === null) return;
  const id = conn.entityId;
  conn.entityId = null;
  peers.delete(id); // se corta el ruteo de voz; al hacer resume se vuelve a setear
  const rt = hub.entities.get(id);
  if (!rt) return;
  // Grace window: NO se borra de inmediato — se espera una posible reconexión (resume).
  rt.disconnected = true;
  rt.inputs.length = 0; // que no siga "moviéndose" con inputs viejos
  graceTimers.set(
    id,
    setTimeout(() => dropEntity(id), GRACE_MS),
  );
  log.info({ id }, 'disconnect (grace)');
}

// ---------- helpers de envío ----------
function send(ws: WebSocket, msg: S2CMessage): void {
  if (ws.readyState === WebSocket.OPEN) ws.send(encode(msg));
}
function broadcastAll(msg: S2CMessage): void {
  const data = encode(msg);
  for (const c of conns) {
    if (c.entityId !== null && c.ws.readyState === WebSocket.OPEN) c.ws.send(data);
  }
}
function broadcastExcept(except: Conn, msg: S2CMessage): void {
  const data = encode(msg);
  for (const c of conns) {
    if (c !== except && c.entityId !== null && c.ws.readyState === WebSocket.OPEN) c.ws.send(data);
  }
}
function spawnPoint(i: number): { x: number; z: number } {
  const a = i * 1.2;
  return { x: Math.cos(a) * 2, z: 6 + Math.sin(a) * 2 };
}

// ---------- Loop de tick fijo a 20 Hz ----------
let tick = 0;
let lastTime = Date.now();
let acc = 0;

/** Difunde el DELTA a cada cliente filtrado por su AOI; devuelve los bytes totales enviados. */
function broadcastState(): number {
  hub.updateVisibility();
  let bytesOut = 0;
  for (const c of conns) {
    if (c.entityId === null || c.ws.readyState !== WebSocket.OPEN) continue;
    const rt = hub.entities.get(c.entityId);
    // DELTA SIN handle (va en WELCOME/JOIN) y filtrado por el AOI del viewer.
    const data = encode({
      op: S2C.DELTA,
      tick,
      ackSeq: rt?.lastSeq ?? 0,
      entities: hub.visibleDeltaFor(c.entityId),
    });
    c.ws.send(data);
    bytesOut += data.byteLength;
  }
  return bytesOut;
}

setInterval(() => {
  const now = Date.now();
  acc += now - lastTime;
  lastTime = now;
  const t0 = performance.now();
  let steps = 0;
  while (acc >= TICK_MS && steps < 5) {
    tick++;
    hub.step(); // la instancia es dueña de su simulación
    acc -= TICK_MS;
    steps++;
  }
  if (steps > 0 && hub.entities.size > 0) {
    const bytesOut = broadcastState();
    metrics.record(performance.now() - t0, hub.entities.size, bytesOut);
  }
}, TICK_MS);

// Director de clima: evalúa el reloj cada 2 s y difunde el clima cuando cambia.
// (Los eventos efímeros — director.maybeEvent() — están desactivados por ahora.)
setInterval(() => {
  if (director.update()) {
    broadcastAll({ op: S2C.ATMOSPHERE_UPDATE, biome: director.biome, weather: director.weather });
    log.info({ weather: director.weather }, 'clima');
  }
}, 2000);

// Métricas de tick a logs cada 10 s (presupuesto ≤1.5 KB/jugador/tick, docs/05 §5.4).
setInterval(() => {
  if (hub.entities.size > 0) log.info(metrics.snapshot(), 'metrics');
}, 10_000);

// Heartbeat (docs/05 §2.2): ping cada PING_INTERVAL_MS; si no llega señal del cliente
// (pong/mensaje) en CONNECTION_TIMEOUT_MS (~3 pings perdidos), se termina. La gracia +
// resume token conservan la sesión para que un microcorte no expulse del mundo.
setInterval(() => {
  const now = Date.now();
  for (const c of conns) {
    if (now - c.lastSeen > CONNECTION_TIMEOUT_MS) {
      c.ws.terminate();
      continue;
    }
    if (c.ws.readyState === WebSocket.OPEN) c.ws.ping();
  }
}, PING_INTERVAL_MS);

httpServer.listen(config.port, () => log.info({ port: config.port }, 'world-server escuchando'));
