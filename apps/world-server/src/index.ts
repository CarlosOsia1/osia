/**
 * world-server (OSIA-S0.4) — composition root del servidor AUTORITATIVO del mundo.
 *
 * Cablea las piezas; la lógica vive en sus módulos (§1.1-S):
 *  - state.ts    → estado compartido (World): hub, clima, métricas, conexiones, peers.
 *  - http.ts     → transporte HTTP: tickets (HS256) + /health + CORS/security headers/Origin.
 *  - handlers.ts → registro WS + router de mensajes + lógica de protocolo (hello/input/chat/voz/bye).
 *  - loop.ts     → tick fijo 20 Hz (sim + DELTA por AOI) + clima + métricas + heartbeat.
 *
 * El cliente NUNCA envía posiciones, solo intención (f, r, yaw); el server es la autoridad.
 */

import { WebSocketServer } from 'ws';
import { config } from './config';
import { log } from './logger';
import { createWorld } from './state';
import { createHttpServer } from './http';
import { registerConnection } from './handlers';
import { startLoops } from './loop';

async function main(): Promise<void> {
  const world = createWorld();

  // Reanudar el clima desde el último checkpoint (S2-B4): si lo hay, el cielo sigue donde
  // estaba en vez de saltar a "despejado". Sin checkpoint (o sin DB) arranca normal.
  const checkpoint = await world.weatherCheckpoint.load();
  if (checkpoint) {
    world.director.restore(checkpoint);
    log.info({ weather: checkpoint.weather }, 'clima restaurado de checkpoint');
  }

  const httpServer = createHttpServer(world);
  // WS (ws; swappable a uWebSockets.js en prod) sobre el mismo server HTTP.
  const wss = new WebSocketServer({ server: httpServer, path: '/world', maxPayload: 64 * 1024 }); // holgura para SDP
  wss.on('connection', (ws, req) => registerConnection(world, ws, req));

  startLoops(world);

  httpServer.listen(config.port, () => log.info({ port: config.port }, 'world-server escuchando'));
}

main().catch((err) => {
  log.error({ err: String(err) }, 'arranque del world-server falló');
  process.exit(1);
});
