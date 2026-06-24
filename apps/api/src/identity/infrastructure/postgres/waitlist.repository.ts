import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import type { WaitlistEntryDto, WaitlistStatus } from '@osia/shared';
import { PG_POOL } from './postgres.tokens';
import type {
  WaitlistRepository,
  WaitlistUpsert,
} from '../../application/ports/out/waitlist.repository';

type WaitlistRow = {
  id: string;
  email: string;
  source: string | null;
  status: WaitlistStatus;
  promoted_invitation_id: string | null;
  created_at: Date;
};

const SELECT_COLS = 'id, email, source, status, promoted_invitation_id, created_at';

/** Adapter pg del repositorio de waitlist. Mapea snake_case (DB) → camelCase (DTO). */
@Injectable()
export class PgWaitlistRepository implements WaitlistRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async upsertByEmail(input: WaitlistUpsert): Promise<{ entry: WaitlistEntryDto; created: boolean }> {
    const inserted = await this.pool.query<WaitlistRow>(
      `INSERT INTO identity.waitlist_entries (email, source, meta)
       VALUES ($1, $2, $3)
       ON CONFLICT (email) DO NOTHING
       RETURNING ${SELECT_COLS}`,
      [input.email, input.source ?? null, input.meta ?? {}],
    );
    if (inserted.rows[0]) return { entry: toDto(inserted.rows[0]), created: true };

    const existing = await this.pool.query<WaitlistRow>(
      `SELECT ${SELECT_COLS} FROM identity.waitlist_entries WHERE email = $1`,
      [input.email],
    );
    // Garantizado por el INSERT anterior (o ya existía): la fila está.
    return { entry: toDto(existing.rows[0]!), created: false };
  }
}

function toDto(row: WaitlistRow): WaitlistEntryDto {
  return {
    id: row.id,
    email: row.email,
    status: row.status,
    source: row.source,
    promotedInvitationId: row.promoted_invitation_id,
    createdAt: row.created_at.toISOString(),
  };
}
