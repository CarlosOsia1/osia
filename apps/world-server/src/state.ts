/**
 * Estado del world-server: tipo de conexión + contexto compartido (World) que las piezas
 * (http/handlers/loop) reciben por inyección. Separa el ESTADO del transporte y los handlers
 * (§1.1-S): antes todo vivía en index.ts (módulo-dios).
 */

import type { WebSocket } from 'ws';
import { asEntityId, type EntityId } from '@osia/shared';
import { config } from './config';
import { Instance } from './instance';
import { WeatherDirector } from './weather';
import { TickMetrics } from './metrics';
import { createPresenceStore, type PresenceStore } from './presence';
import { createWeatherCheckpointStore, type WeatherCheckpointStore } from './weatherCheckpoint';
import type { TokenBucket } from './rateLimit';

export type Conn = {
  ws: WebSocket;
  entityId: EntityId | null;
  lastSeen: number; // último instante con señal del cliente (pong/mensaje) → timeout de heartbeat
  helloTimer?: ReturnType<typeof setTimeout>; // cierra el socket si no llega HELLO a tiempo
  chat?: TokenBucket; // anti-spam de chat (creado al primer mensaje)
  voiceBucket?: TokenBucket; // anti-flood del signaling de voz
};

export type World = {
  hub: Instance;
  director: WeatherDirector; // clima autoritativo + determinista
  metrics: TickMetrics;
  conns: Set<Conn>;
  peers: Map<EntityId, Conn>; // entityId → conn (ruteo O(1) del signaling de voz)
  graceTimers: Map<EntityId, ReturnType<typeof setTimeout>>; // borrado diferido tras una caída (resume)
  presence: PresenceStore; // checkpoint durable de presencia (Pg o Null según DATABASE_URL)
  weatherCheckpoint: WeatherCheckpointStore; // reanudación del clima tras reinicio (S2-B4)
  atmosphereBroadcasts: number; // contador de difusiones de ATMOSPHERE_UPDATE (observabilidad, S2-C1)
  /** Acuña el siguiente EntityId (autoridad: el cliente nunca impone su id). */
  mintId: () => EntityId;
};

export function createWorld(): World {
  let next = 1;
  return {
    hub: new Instance('hub'),
    director: new WeatherDirector(config.biome, Date.now, config.worldSeed),
    metrics: new TickMetrics(),
    conns: new Set<Conn>(),
    peers: new Map(),
    graceTimers: new Map(),
    presence: createPresenceStore(config.databaseUrl),
    weatherCheckpoint: createWeatherCheckpointStore(config.databaseUrl),
    atmosphereBroadcasts: 0,
    mintId: () => asEntityId(next++),
  };
}
