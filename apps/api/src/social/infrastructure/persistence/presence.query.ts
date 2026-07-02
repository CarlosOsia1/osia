import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import { asAccountId, type NetworkPresenceEntryDto, type PresenceEntryDto } from '@osia/shared';
import { PG_POOL } from '../../../identity/infrastructure/postgres/postgres.tokens';
import type { PresenceQueryPort } from '../../application/ports/out/presence.query';
import { toProfileBrief, PROFILE_BRIEF_COLS, type ProfileBriefRow } from './mappers';

type PresenceRow = {
  account_id: string;
  world_instance_id: string | null;
  left_at: Date | null;
  joined_at: Date | null;
  zone: string | null;
};

type NetworkPresenceRow = ProfileBriefRow & {
  account_id: string;
  world_instance_id: string;
  joined_at: Date;
  zone: string;
};

/**
 * Adapter de presencia (S3.4-H1) sobre `world.presence_sessions` (checkpoint durable del world-server):
 * una sesión con `left_at IS NULL` = online. Filtra por relación (sigue / lo siguen) — privacidad. SQL
 * directo. Nota: si el world-server cae sin cerrar la sesión, queda "online fantasma" hasta el cierre;
 * la presencia EN VIVO con TTL (Redis) es una mejora de S3.6.
 */
@Injectable()
export class PgPresenceQuery implements PresenceQueryPort {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async getPresence(viewerAccountId: string, accountIds: string[]): Promise<PresenceEntryDto[]> {
    if (accountIds.length === 0) return [];
    const res = await this.pool.query<PresenceRow>(
      `WITH requested AS (SELECT DISTINCT unnest($2::uuid[]) AS account_id),
       allowed AS (
         -- Regla direccional (S3.9, decisión de Carlos): ves "en línea" de X SOLO si X TE SIGUE
         -- (X es el follower, el viewer es el followee). Seguir a X no basta para ver su presencia.
         SELECT r.account_id FROM requested r
         WHERE EXISTS (
           SELECT 1 FROM social.follows f WHERE f.status = 'active'
             AND f.follower_account_id = r.account_id AND f.followee_account_id = $1
         )
       ),
       latest AS (
         SELECT DISTINCT ON (ps.account_id)
           ps.account_id, ps.world_instance_id, ps.left_at, ps.joined_at, z.name AS zone
         FROM world.presence_sessions ps
         JOIN world.world_instances wi ON wi.id = ps.world_instance_id
         JOIN world.zones z ON z.id = wi.zone_id
         WHERE ps.account_id IN (SELECT account_id FROM allowed)
         ORDER BY ps.account_id, ps.joined_at DESC
       )
       SELECT a.account_id, l.world_instance_id, l.left_at, l.joined_at, l.zone
       FROM allowed a
       LEFT JOIN latest l ON l.account_id = a.account_id`,
      [viewerAccountId, accountIds],
    );
    return res.rows.map(toPresenceEntry);
  }

  async getNetworkPresence(viewerAccountId: string, limit: number): Promise<NetworkPresenceEntryDto[]> {
    // Mi red que está en el Mundo AHORA: seguidores activos (regla direccional S3.9: ves online a X
    // solo si X te sigue) cuya ÚLTIMA sesión sigue abierta. El LATERAL toma la sesión más reciente y
    // el ON la exige abierta (left_at IS NULL) — una sola consulta, sin accountIds del cliente.
    const res = await this.pool.query<NetworkPresenceRow>(
      `SELECT f.follower_account_id AS account_id, ${PROFILE_BRIEF_COLS},
              l.world_instance_id, l.joined_at, l.zone
       FROM social.follows f
       JOIN identity.profiles p ON p.account_id = f.follower_account_id AND p.deleted_at IS NULL
       JOIN LATERAL (
         SELECT ps.world_instance_id, ps.joined_at, ps.left_at, z.name AS zone
         FROM world.presence_sessions ps
         JOIN world.world_instances wi ON wi.id = ps.world_instance_id
         JOIN world.zones z ON z.id = wi.zone_id
         WHERE ps.account_id = f.follower_account_id
         ORDER BY ps.joined_at DESC
         LIMIT 1
       ) l ON l.left_at IS NULL
       WHERE f.followee_account_id = $1 AND f.status = 'active'
       ORDER BY l.joined_at DESC
       LIMIT $2`,
      [viewerAccountId, limit],
    );
    return res.rows.map((row) => ({
      profile: toProfileBrief(row),
      accountId: asAccountId(row.account_id),
      zone: row.zone,
      instanceId: row.world_instance_id,
      since: row.joined_at.toISOString(),
    }));
  }
}

function toPresenceEntry(row: PresenceRow): PresenceEntryDto {
  const online = row.joined_at !== null && row.left_at === null;
  const lastSeen = row.left_at ?? row.joined_at;
  return {
    accountId: asAccountId(row.account_id),
    online,
    zone: online ? row.zone : null,
    instanceId: online ? row.world_instance_id : null,
    lastSeen: lastSeen ? lastSeen.toISOString() : null,
  };
}
