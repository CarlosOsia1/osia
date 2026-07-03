import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import type { Tx } from '../../../common/tx';
import { PG_POOL } from './postgres.tokens';
import type {
  NewServerSession,
  ServerSession,
  SessionStore,
} from '../../application/ports/out/session-store.port';

/** Fila cruda de `identity.sessions`. */
type SessionRow = {
  id: string;
  account_id: string;
  supabase_access_token: string;
  supabase_refresh_token: string;
  access_expires_at: Date;
  expires_at: Date;
};

const toServerSession = (r: SessionRow): ServerSession => ({
  id: r.id,
  accountId: r.account_id,
  accessToken: r.supabase_access_token,
  refreshToken: r.supabase_refresh_token,
  accessExpiresAt: r.access_expires_at,
  expiresAt: r.expires_at,
});

const COLS =
  'id, account_id, supabase_access_token, supabase_refresh_token, access_expires_at, expires_at';

/** Adapter Postgres del almacén de sesiones server-side (Ola 1F). SQL directo (schema no expuesto). */
@Injectable()
export class PgSessionStore implements SessionStore {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async create(s: NewServerSession): Promise<void> {
    await this.pool.query(
      `INSERT INTO identity.sessions
         (id, account_id, supabase_access_token, supabase_refresh_token, access_expires_at, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [s.id, s.accountId, s.accessToken, s.refreshToken, s.accessExpiresAt, s.expiresAt],
    );
  }

  async findById(id: string): Promise<ServerSession | null> {
    const res = await this.pool.query<SessionRow>(
      `SELECT ${COLS} FROM identity.sessions WHERE id = $1`,
      [id],
    );
    const row = res.rows[0];
    return row ? toServerSession(row) : null;
  }

  async findByIdForUpdate(tx: Tx, id: string): Promise<ServerSession | null> {
    const res = await tx.query(`SELECT ${COLS} FROM identity.sessions WHERE id = $1 FOR UPDATE`, [id]);
    const row = res.rows[0] as SessionRow | undefined;
    return row ? toServerSession(row) : null;
  }

  async updateTokens(
    tx: Tx,
    id: string,
    accessToken: string,
    refreshToken: string,
    accessExpiresAt: Date,
  ): Promise<void> {
    await tx.query(
      `UPDATE identity.sessions
         SET supabase_access_token = $2, supabase_refresh_token = $3, access_expires_at = $4,
             last_used_at = now()
       WHERE id = $1`,
      [id, accessToken, refreshToken, accessExpiresAt],
    );
  }

  async deleteById(id: string): Promise<string | null> {
    const res = await this.pool.query<{ supabase_refresh_token: string }>(
      `DELETE FROM identity.sessions WHERE id = $1 RETURNING supabase_refresh_token`,
      [id],
    );
    return res.rows[0]?.supabase_refresh_token ?? null;
  }

  async deleteByAccount(accountId: string): Promise<void> {
    await this.pool.query(`DELETE FROM identity.sessions WHERE account_id = $1`, [accountId]);
  }
}
