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
  applyMovement,
  normalizeChat,
  PROTOCOL_VERSION,
  TICK_HZ,
  TICK_MS,
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

const hub = new Instance('hub');
const director = new WeatherDirector(config.biome, Date.now); // clima autoritativo del mundo
let nextEntityId = 1;

type Conn = {
  ws: WebSocket;
  entityId: number | null;
  alive: boolean;
  chatTokens?: number; // token bucket de chat (anti-spam)
  chatRefillAt?: number;
  voiceTokens?: number; // token bucket de signaling de voz (anti-flood/DoS)
  voiceRefillAt?: number;
};
const conns = new Set<Conn>();
const peers = new Map<number, Conn>(); // entityId → conn (ruteo O(1) del signaling de voz)

// Rate-limit de emisión de tickets por IP (anti-flood): máx 20 por minuto.
const ticketHits = new Map<string, { n: number; resetAt: number }>();
function allowTicket(ip: string): boolean {
  const now = Date.now();
  const e = ticketHits.get(ip);
  if (!e || now > e.resetAt) {
    ticketHits.set(ip, { n: 1, resetAt: now + 60_000 });
    return true;
  }
  if (e.n >= 20) return false;
  e.n++;
  return true;
}
const GRACE_MS = 30_000; // ventana de reconexión: la entidad se conserva tras una caída
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
      .end(JSON.stringify({ ok: true, players: hub.entities.size }));
  }

  if (req.method === 'POST' && req.url === '/world/tickets') {
    const ip = req.socket.remoteAddress ?? 'unknown';
    if (!allowTicket(ip)) {
      return void res.writeHead(429, { 'content-type': 'application/json' }).end(JSON.stringify({ error: 'rate_limit' }));
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
          const handle = String(parsed.handle ?? 'anónimo').slice(0, 24) || 'anónimo';
          const worldId = String(parsed.worldId ?? 'osia');
          const ticket = await issueTicket(handle, worldId);
          res
            .writeHead(200, { 'content-type': 'application/json' })
            .end(JSON.stringify({ ticket, wsUrl: `ws://localhost:${config.port}/world` }));
        } catch {
          res.writeHead(400, { 'content-type': 'application/json' }).end(JSON.stringify({ error: 'bad_request' }));
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
  const conn: Conn = { ws, entityId: null, alive: true };
  conns.add(conn);
  ws.on('message', (data: Buffer) => void onMessage(conn, data)); // frames binarios
  ws.on('pong', () => {
    conn.alive = true;
  });
  ws.on('close', () => onClose(conn));
  ws.on('error', () => onClose(conn));
});

async function onMessage(conn: Conn, raw: Uint8Array): Promise<void> {
  const msg = decode<C2SMessage>(raw);
  if (!msg) return void send(conn.ws, { op: S2C.ERROR, code: ErrorCode.BAD_MESSAGE, message: 'mensaje inválido' });
  if (conn.entityId === null && msg.op !== C2S.HELLO) {
    return void send(conn.ws, { op: S2C.ERROR, code: ErrorCode.BAD_MESSAGE, message: 'esperaba HELLO' });
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
      conn.ws.close();
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
  let handle: string;
  try {
    handle = (await verifyTicket(msg.ticket)).handle;
  } catch {
    send(conn.ws, { op: S2C.ERROR, code: ErrorCode.BAD_TICKET, message: 'ticket inválido' });
    return void conn.ws.close();
  }
  // Reconexión: re-adoptar la entidad desconectada si el resumeToken coincide (dentro del grace).
  if (msg.resumeToken) {
    const prev = [...hub.entities.values()].find((e) => e.disconnected && e.token === msg.resumeToken);
    if (prev) {
      const timer = graceTimers.get(prev.state.id);
      if (timer) clearTimeout(timer);
      graceTimers.delete(prev.state.id);
      prev.disconnected = false;
      prev.inputs.length = 0;
      conn.entityId = prev.state.id;
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
      log.info({ id: prev.state.id }, 'resume');
      return;
    }
  }

  if (hub.full) {
    send(conn.ws, { op: S2C.ERROR, code: ErrorCode.INSTANCE_FULL, message: 'instancia llena' });
    return void conn.ws.close();
  }

  const id = nextEntityId++;
  conn.entityId = id;
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
  broadcastExcept(conn, { op: S2C.ENTITY_JOIN, entity: { ...rt.state } });
  log.info({ id, handle, players: hub.entities.size }, 'join');
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
  const now = Date.now();
  if (conn.chatTokens === undefined) {
    conn.chatTokens = CHAT_CAP;
    conn.chatRefillAt = now;
  }
  const elapsed = now - (conn.chatRefillAt ?? now);
  if (elapsed >= CHAT_REFILL_MS) {
    conn.chatTokens = Math.min(CHAT_CAP, conn.chatTokens + Math.floor(elapsed / CHAT_REFILL_MS));
    conn.chatRefillAt = now;
  }
  if (conn.chatTokens <= 0) return false;
  conn.chatTokens--;
  return true;
}

function onChat(conn: Conn, msg: ChatSendMsg): void {
  if (conn.entityId === null) return;
  const rt = hub.entities.get(conn.entityId);
  if (!rt) return;
  if (!takeChatToken(conn)) {
    return void send(conn.ws, { op: S2C.ERROR, code: ErrorCode.RATE_LIMIT, message: 'demasiados mensajes' });
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
  const now = Date.now();
  if (conn.voiceTokens === undefined) {
    conn.voiceTokens = VOICE_CAP;
    conn.voiceRefillAt = now;
  }
  const elapsed = now - (conn.voiceRefillAt ?? now);
  if (elapsed >= VOICE_REFILL_MS) {
    conn.voiceTokens = Math.min(VOICE_CAP, conn.voiceTokens + Math.floor(elapsed / VOICE_REFILL_MS));
    conn.voiceRefillAt = now;
  }
  if (conn.voiceTokens <= 0) return false;
  conn.voiceTokens--;
  return true;
}

/** Relay BYTE-CIEGO del signaling de voz: jamás parsea el SDP/ICE; inyecta srcId (anti-spoof). */
function onVoiceSignal(conn: Conn, msg: VoiceSignalMsg): void {
  if (conn.entityId === null) return;
  if (!takeVoiceToken(conn)) return; // flood → descartar en silencio
  if (msg.dstId === conn.entityId) return; // no a sí mismo
  const dst = peers.get(msg.dstId); // misma instancia (en F0 sólo existe el hub)
  if (!dst || dst.ws.readyState !== WebSocket.OPEN) return; // destino ausente → descartar
  send(dst.ws, { op: S2C.VOICE_SIGNAL, srcId: conn.entityId, kind: msg.kind, payload: msg.payload });
}

/** Difunde el estado de voz (mic/hablando/sordo) al resto del hub. */
function onVoiceState(conn: Conn, msg: VoiceStateMsg): void {
  if (conn.entityId === null) return;
  if (!takeVoiceToken(conn)) return;
  broadcastExcept(conn, { op: S2C.VOICE_STATE, id: conn.entityId, flags: msg.flags & 0x07 });
}

function dropEntity(id: number): void {
  graceTimers.delete(id);
  if (hub.entities.has(id)) {
    hub.remove(id);
    broadcastAll({ op: S2C.ENTITY_LEAVE, id });
    log.info({ id, players: hub.entities.size }, 'leave');
  }
}

function onClose(conn: Conn): void {
  if (!conns.has(conn)) return;
  conns.delete(conn);
  if (conn.entityId === null) return;
  const id = conn.entityId;
  conn.entityId = null;
  peers.delete(id); // se corta el ruteo de voz; al hacer resume se vuelve a setear
  const rt = hub.entities.get(id);
  if (!rt) return;
  // Grace window: NO se borra de inmediato — se espera una posible reconexión (resume).
  rt.disconnected = true;
  rt.inputs.length = 0; // que no siga "moviéndose" con inputs viejos
  graceTimers.set(id, setTimeout(() => dropEntity(id), GRACE_MS));
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
const pos = { x: 0, z: 0 };

function simulate(): void {
  tick++;
  for (const rt of hub.entities.values()) {
    if (rt.inputs.length === 0) continue; // sin inputs este tick → la entidad no avanza
    rt.inputs.sort((a, b) => a.seq - b.seq);
    pos.x = rt.state.x;
    pos.z = rt.state.z;
    // Drena TODOS los inputs encolados aplicando el MISMO applyMovement con su propio dt
    // (igual que el replay del cliente → convergencia exacta, sin rubber-band).
    for (const inp of rt.inputs) {
      applyMovement(pos, inp, inp.dt);
      rt.lastSeq = inp.seq; // ackSeq = último seq procesado
      rt.state.yaw = inp.yaw;
    }
    rt.state.x = pos.x;
    rt.state.z = pos.z;
    rt.inputs.length = 0;
  }
}

function broadcastState(): void {
  // Delta-compression del hot path: el DELTA NO lleva handle (va en WELCOME/JOIN).
  const entities = [...hub.entities.values()].map((e) => ({
    id: e.state.id,
    x: e.state.x,
    z: e.state.z,
    yaw: e.state.yaw,
  }));
  for (const c of conns) {
    if (c.entityId === null || c.ws.readyState !== WebSocket.OPEN) continue;
    const rt = hub.entities.get(c.entityId);
    c.ws.send(encode({ op: S2C.DELTA, tick, ackSeq: rt?.lastSeq ?? 0, entities }));
  }
}

setInterval(() => {
  const now = Date.now();
  acc += now - lastTime;
  lastTime = now;
  let steps = 0;
  while (acc >= TICK_MS && steps < 5) {
    simulate();
    acc -= TICK_MS;
    steps++;
  }
  if (steps > 0 && hub.entities.size > 0) broadcastState();
}, TICK_MS);

// Director de clima: evalúa el reloj cada 2 s y difunde el clima cuando cambia.
// (Los eventos efímeros — director.maybeEvent() — están desactivados por ahora.)
setInterval(() => {
  if (director.update()) {
    broadcastAll({ op: S2C.ATMOSPHERE_UPDATE, biome: director.biome, weather: director.weather });
    log.info({ weather: director.weather }, 'clima');
  }
}, 2000);

// Heartbeat: cierra conexiones muertas.
setInterval(() => {
  for (const c of conns) {
    if (!c.alive) {
      c.ws.terminate();
      continue;
    }
    c.alive = false;
    if (c.ws.readyState === WebSocket.OPEN) c.ws.ping();
  }
}, 2000);

httpServer.listen(config.port, () => log.info({ port: config.port }, 'world-server escuchando'));
