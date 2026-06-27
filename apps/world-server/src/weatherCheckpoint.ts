/**
 * Checkpoint durable del clima (S2-B4). Una fila por instancia en `world.weather_checkpoints`:
 * permite REANUDAR el clima (lluvia/niebla/…) tras un reinicio del world-server en vez de
 * volver a "despejado". Mismo patrón que presence.ts: OFF del hot path, fire-and-forget, y un
 * fallo de DB NUNCA tumba la simulación. Valor modesto con un solo hub; el día/noche no se
 * persiste (es determinista por tiempo).
 */

import { Pool } from 'pg';
import { DEFAULT_WORLD_ID } from '@osia/shared';
import { isWeatherKind } from '@osia/atmosphere';
import { log } from './logger';
import type { WeatherCheckpoint } from './weather';

export interface WeatherCheckpointStore {
  /** Último checkpoint de la instancia hub (o null si no hay / DB deshabilitada). */
  load(): Promise<WeatherCheckpoint | null>;
  /** Guarda (upsert) el checkpoint. Idempotente; tolera fallos de DB. */
  save(cp: WeatherCheckpoint): Promise<void>;
  shutdown(): Promise<void>;
}

/** No-op: dev/local sin DATABASE_URL. El clima corre, sin reanudación tras reinicio. */
export class NullWeatherCheckpointStore implements WeatherCheckpointStore {
  async load(): Promise<WeatherCheckpoint | null> {
    return null;
  }
  async save(): Promise<void> {}
  async shutdown(): Promise<void> {}
}

type CheckpointRow = {
  seed: number;
  phase_until: string; // bigint llega como string en pg
  active: boolean;
  weather: { kind?: string; intensity?: number } | null;
  day_index: string; // bigint
  events_today: number;
};

export class PgWeatherCheckpointStore implements WeatherCheckpointStore {
  private readonly pool: Pool;
  private readonly instanceId: Promise<string | null>;

  constructor(databaseUrl: string) {
    // Igual que presence.ts: quitar sslmode de la URL y dejar que el objeto `ssl` maneje el TLS
    // (cert self-signed de Supabase). Endurecer el CA es tarea de deploy (S1.9).
    const cleanUrl = databaseUrl.replace(/([?&])sslmode=[^&]*&?/i, '$1').replace(/[?&]$/, '');
    this.pool = new Pool({ connectionString: cleanUrl, max: 2, ssl: { rejectUnauthorized: false } });
    this.instanceId = this.resolveInstance();
  }

  private async resolveInstance(): Promise<string | null> {
    try {
      const res = await this.pool.query<{ id: string }>(
        `SELECT wi.id FROM world.world_instances wi
           JOIN world.zones z ON z.id = wi.zone_id
           JOIN world.worlds w ON w.id = z.world_id
          WHERE w.slug = $1 AND z.slug = 'hub' AND wi.shard_key = 'default'
          LIMIT 1`,
        [DEFAULT_WORLD_ID],
      );
      return res.rows[0]?.id ?? null;
    } catch (err) {
      log.warn({ err: String(err) }, 'weatherCheckpoint: no se pudo resolver la instancia');
      return null;
    }
  }

  async load(): Promise<WeatherCheckpoint | null> {
    try {
      const instanceId = await this.instanceId;
      if (!instanceId) return null;
      const res = await this.pool.query<CheckpointRow>(
        `SELECT seed, phase_until, active, weather, day_index, events_today
           FROM world.weather_checkpoints WHERE world_instance_id = $1`,
        [instanceId],
      );
      const row = res.rows[0];
      if (!row) return null;
      const w = row.weather ?? {};
      // Validación al borde: kind del catálogo o despejado; intensity en [0,1].
      const kind = typeof w.kind === 'string' && isWeatherKind(w.kind) ? w.kind : 'despejado';
      const intensity = Number.isFinite(w.intensity) ? Math.min(1, Math.max(0, w.intensity as number)) : 0;
      return {
        seed: Number(row.seed),
        phaseUntil: Number(row.phase_until),
        active: Boolean(row.active),
        weather: { kind, intensity },
        dayIndex: Number(row.day_index) || 0,
        eventsToday: Number(row.events_today) || 0,
      };
    } catch (err) {
      log.warn({ err: String(err) }, 'weatherCheckpoint: load falló');
      return null;
    }
  }

  async save(cp: WeatherCheckpoint): Promise<void> {
    try {
      const instanceId = await this.instanceId;
      if (!instanceId) return;
      await this.pool.query(
        `INSERT INTO world.weather_checkpoints
           (world_instance_id, seed, phase_until, active, weather, day_index, events_today, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, now())
         ON CONFLICT (world_instance_id) DO UPDATE SET
           seed = $2, phase_until = $3, active = $4, weather = $5,
           day_index = $6, events_today = $7, updated_at = now()`,
        [
          instanceId,
          cp.seed,
          cp.phaseUntil,
          cp.active,
          JSON.stringify(cp.weather),
          cp.dayIndex,
          cp.eventsToday,
        ],
      );
    } catch (err) {
      log.warn({ err: String(err) }, 'weatherCheckpoint: save falló');
    }
  }

  async shutdown(): Promise<void> {
    await this.pool.end();
  }
}

/** Crea el store según el entorno: Pg si hay DATABASE_URL, Null en dev/local. */
export function createWeatherCheckpointStore(databaseUrl: string | undefined): WeatherCheckpointStore {
  return databaseUrl ? new PgWeatherCheckpointStore(databaseUrl) : new NullWeatherCheckpointStore();
}
