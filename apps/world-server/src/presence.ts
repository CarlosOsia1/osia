/**
 * Presence checkpoint durable (S1.8-H2b). Una fila por sesión en `world.presence_sessions`
 * (apertura/cierre). Está OFF del hot path: fire-and-forget, y un fallo de DB NUNCA tumba la
 * simulación. La verificación del ticket sigue SIN tocar Postgres (server-authoritative, §1.4);
 * esto es solo el histórico ("estuviste 3h", "quién estuvo contigo"). La presencia EN VIVO va en
 * Redis con TTL (Fase 2+), no aquí.
 */

import { Pool } from 'pg';
import { DEFAULT_WORLD_ID } from '@osia/shared';
import { log } from './logger';

export interface PresenceStore {
  /** Abre la sesión del residente; devuelve el id de la fila (o null si no se pudo / deshabilitado). */
  open(accountId: string, connectionId: string): Promise<string | null>;
  /** Cierra la sesión (marca left_at). Idempotente. */
  close(sessionId: string): Promise<void>;
  shutdown(): Promise<void>;
}

/** No-op: dev/local sin DATABASE_URL. El mundo corre, sin histórico de presencia. */
export class NullPresenceStore implements PresenceStore {
  async open(): Promise<string | null> {
    return null;
  }
  async close(): Promise<void> {}
  async shutdown(): Promise<void> {}
}

export class PgPresenceStore implements PresenceStore {
  private readonly pool: Pool;
  /** Id de la instancia hub (resuelto una vez del catálogo sembrado). */
  private readonly instanceId: Promise<string | null>;

  constructor(databaseUrl: string) {
    // `sslmode` en la URL forzaría verify-full en pg v8.13 y chocaría con el cert self-signed de
    // Supabase; lo quitamos y dejamos que el objeto `ssl` maneje el TLS (igual que apps/api). En
    // prod el CA de Supabase debería verificarse: endurecerlo es tarea de S1.9 (deploy).
    const cleanUrl = databaseUrl.replace(/([?&])sslmode=[^&]*&?/i, '$1').replace(/[?&]$/, '');
    this.pool = new Pool({ connectionString: cleanUrl, max: 4, ssl: { rejectUnauthorized: false } });
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
      const id = res.rows[0]?.id ?? null;
      if (!id) log.warn('presence: world_instance hub/default no encontrada (¿seed aplicado?)');
      return id;
    } catch (err) {
      log.warn({ err: String(err) }, 'presence: no se pudo resolver la instancia');
      return null;
    }
  }

  async open(accountId: string, connectionId: string): Promise<string | null> {
    try {
      const instanceId = await this.instanceId;
      if (!instanceId) return null;
      const res = await this.pool.query<{ id: string }>(
        `INSERT INTO world.presence_sessions (account_id, world_instance_id, connection_id)
         VALUES ($1, $2, $3) RETURNING id`,
        [accountId, instanceId, connectionId],
      );
      return res.rows[0]?.id ?? null;
    } catch (err) {
      log.warn({ err: String(err) }, 'presence: open falló');
      return null;
    }
  }

  async close(sessionId: string): Promise<void> {
    try {
      await this.pool.query(
        `UPDATE world.presence_sessions SET left_at = now() WHERE id = $1 AND left_at IS NULL`,
        [sessionId],
      );
    } catch (err) {
      log.warn({ err: String(err) }, 'presence: close falló');
    }
  }

  async shutdown(): Promise<void> {
    await this.pool.end();
  }
}

/** Crea el store según el entorno: Pg si hay DATABASE_URL, Null en dev/local. */
export function createPresenceStore(databaseUrl: string | undefined): PresenceStore {
  return databaseUrl ? new PgPresenceStore(databaseUrl) : new NullPresenceStore();
}
