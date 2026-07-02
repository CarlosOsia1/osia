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

  // Saneo al ARRANCAR: si un crash/kill previo dejó sesiones de presencia abiertas, La Red Social
  // mostraría a esa gente `online` para siempre (lee left_at IS NULL). Cerrarlas antes de aceptar
  // conexiones. Idempotente y no bloquea el arranque si la DB falla.
  await world.presence.sweepOpenSessions();

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

  // Apagado LIMPIO (SIGTERM de un deploy, SIGINT de Ctrl-C): dejar de aceptar conexiones, cerrar los
  // sockets con 1001 (going away), CERRAR las sesiones de presencia abiertas (si no, quedan `online`
  // fantasma), persistir el clima y soltar los pools de pg. Idempotente ante señales repetidas.
  let closing = false;
  async function shutdown(signal: string): Promise<void> {
    if (closing) return;
    closing = true;
    log.info({ signal }, 'apagando world-server');
    try {
      wss.clients.forEach((ws) => ws.close(1001, 'server shutdown'));
      httpServer.close();
      // Cerrar las sesiones de presencia vivas (residentes con cuenta) para no dejar `online` fantasma.
      await Promise.allSettled(
        [...world.hub.entities.values()]
          .map((e) => e.presenceSessionId)
          .filter((sid): sid is string => sid !== null)
          .map((sid) => world.presence.close(sid)),
      );
      await world.weatherCheckpoint.save(world.director.serialize());
      await Promise.allSettled([world.presence.shutdown(), world.weatherCheckpoint.shutdown()]);
    } catch (err) {
      log.warn({ err: String(err) }, 'apagado con errores (se continúa)');
    } finally {
      process.exit(0);
    }
  }
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

main().catch((err) => {
  log.error({ err: String(err) }, 'arranque del world-server falló');
  process.exit(1);
});
