/**
 * Loops temporales del world-server: tick fijo 20 Hz (simulación + DELTA por AOI), director
 * de clima, métricas y heartbeat. Separado del transporte y los handlers (§1.1-S).
 */

import { WebSocket } from 'ws';
import {
  encode,
  S2C,
  TICK_MS,
  TICK_HZ,
  MAX_CATCHUP_TICKS,
  AOI_BUDGET_BYTES,
  PING_INTERVAL_MS,
  CONNECTION_TIMEOUT_MS,
} from '@osia/shared';
import { log } from './logger';
import { broadcastAll } from './send';
import type { World } from './state';

const WEATHER_CHECK_MS = 2000; // cada cuánto el director re-evalúa el reloj para difundir clima
const METRICS_LOG_MS = 10_000; // cada cuánto se loguean las métricas de tick

export function startLoops(world: World): void {
  let tick = 0;
  let lastTime = Date.now();
  let acc = 0;

  /** Difunde el DELTA a cada cliente filtrado por su AOI; devuelve los bytes totales enviados. */
  function broadcastState(): number {
    world.hub.updateVisibility();
    let bytesOut = 0;
    for (const c of world.conns) {
      if (c.entityId === null || c.ws.readyState !== WebSocket.OPEN) continue;
      const rt = world.hub.entities.get(c.entityId);
      // DELTA SIN handle (va en WELCOME/JOIN) y filtrado por el AOI del viewer.
      const data = encode({
        op: S2C.DELTA,
        tick,
        ackSeq: rt?.lastSeq ?? 0,
        entities: world.hub.visibleDeltaFor(c.entityId),
      });
      c.ws.send(data);
      bytesOut += data.byteLength;
      // §7: presupuesto ≤ AOI_BUDGET_BYTES por jugador/tick. Si se supera, avisar (rate-limit
      // del log por throttle de ticks) para recortar/optimizar en vez de dejarlo pasar.
      if (data.byteLength > AOI_BUDGET_BYTES && tick % TICK_HZ === 0) {
        log.warn({ viewerId: c.entityId, bytes: data.byteLength }, 'AOI budget excedido');
      }
    }
    return bytesOut;
  }

  // Loop de tick fijo a 20 Hz (acumulador + catch-up acotado).
  setInterval(() => {
    const now = Date.now();
    acc += now - lastTime;
    lastTime = now;
    const t0 = performance.now();
    let steps = 0;
    while (acc >= TICK_MS && steps < MAX_CATCHUP_TICKS) {
      tick++;
      world.hub.step(); // la instancia es dueña de su simulación
      acc -= TICK_MS;
      steps++;
    }
    // Si se topó el cap de catch-up (stall largo: GC/congelado), descartar el backlog en vez de
    // perseguirlo eternamente (cada tick agotaría los pasos sin alcanzar el tiempo real).
    if (steps === MAX_CATCHUP_TICKS && acc > TICK_MS) acc = TICK_MS;
    if (steps > 0 && world.hub.entities.size > 0) {
      const bytesOut = broadcastState();
      world.metrics.record(performance.now() - t0, world.hub.entities.size, bytesOut);
    }
  }, TICK_MS);

  // Director de clima: evalúa el reloj y difunde el clima cuando cambia.
  // (Los eventos efímeros — director.maybeEvent() — están desactivados por ahora.)
  setInterval(() => {
    if (world.director.update()) {
      broadcastAll(world.conns, {
        op: S2C.ATMOSPHERE_UPDATE,
        biome: world.director.biome,
        weather: world.director.weather,
      });
      log.info({ weather: world.director.weather }, 'clima');
    }
  }, WEATHER_CHECK_MS);

  // Métricas de tick a logs (presupuesto ≤1.5 KB/jugador/tick, docs/05 §5.4).
  setInterval(() => {
    if (world.hub.entities.size > 0) log.info(world.metrics.snapshot(), 'metrics');
  }, METRICS_LOG_MS);

  // Heartbeat (docs/05 §2.2): ping cada PING_INTERVAL_MS; si no llega señal del cliente
  // (pong/mensaje) en CONNECTION_TIMEOUT_MS (~3 pings perdidos), se termina. La gracia +
  // resume token conservan la sesión para que un microcorte no expulse del mundo.
  setInterval(() => {
    const now = Date.now();
    for (const c of world.conns) {
      if (now - c.lastSeen > CONNECTION_TIMEOUT_MS) {
        c.ws.terminate();
        continue;
      }
      if (c.ws.readyState === WebSocket.OPEN) c.ws.ping();
    }
  }, PING_INTERVAL_MS);
}
