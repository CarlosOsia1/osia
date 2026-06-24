import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import type { InvitationStatus } from '@osia/shared';
import { PG_POOL } from './postgres.tokens';
import type {
  InvitationRecord,
  InvitationRepository,
} from '../../application/ports/out/invitation.repository';

type Row = {
  code: string;
  status: InvitationStatus;
  inviter_account_id: string | null;
  expires_at: Date | null;
};

@Injectable()
export class PgInvitationRepository implements InvitationRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async findByCode(code: string): Promise<InvitationRecord | null> {
    const res = await this.pool.query<Row>(
      `SELECT code, status, inviter_account_id, expires_at FROM identity.invitations WHERE code = $1`,
      [code],
    );
    const row = res.rows[0];
    if (!row) return null;
    return {
      code: row.code,
      status: row.status,
      inviterAccountId: row.inviter_account_id,
      expiresAt: row.expires_at,
    };
  }
}
