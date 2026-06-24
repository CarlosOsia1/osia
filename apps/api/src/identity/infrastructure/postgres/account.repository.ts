import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import type { AccountDto, ProfileDto } from '@osia/shared';
import { PG_POOL } from './postgres.tokens';
import type {
  AccountRepository,
  SignupCompletion,
} from '../../application/ports/out/account.repository';
import { HandleTakenError, InvitationConflictError } from '../../application/errors';
import {
  ACCOUNT_COLS,
  PROFILE_COLS,
  isUniqueViolation,
  toAccountDto,
  toProfileDto,
  type AccountRow,
  type ProfileRow,
} from './mappers';

@Injectable()
export class PgAccountRepository implements AccountRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async isHandleTaken(handle: string): Promise<boolean> {
    const res = await this.pool.query(
      `SELECT 1 FROM identity.profiles WHERE handle = $1 AND deleted_at IS NULL LIMIT 1`,
      [handle],
    );
    return (res.rowCount ?? 0) > 0;
  }

  async completeSignup(
    input: SignupCompletion,
  ): Promise<{ account: AccountDto; profile: ProfileDto }> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // 1) handle + displayName definitivos (puede chocar unicidad → HandleTaken).
      try {
        await client.query(
          `UPDATE identity.profiles SET handle = $2, display_name = $3 WHERE account_id = $1`,
          [input.accountId, input.handle, input.displayName],
        );
      } catch (e) {
        if (isUniqueViolation(e)) throw new HandleTakenError();
        throw e;
      }

      // 2) aceptar la invitación SOLO si sigue pending (anti doble canje, atómico).
      const inv = await client.query(
        `UPDATE identity.invitations
         SET status = 'accepted', accepted_by_account_id = $1, accepted_at = now()
         WHERE code = $2 AND status = 'pending'`,
        [input.accountId, input.code],
      );
      if ((inv.rowCount ?? 0) === 0) throw new InvitationConflictError();

      // 3) registrar quién invitó (la cuenta sigue 'invited' hasta verificar email — S1.5).
      await client.query(`UPDATE identity.accounts SET invited_by_account_id = $2 WHERE id = $1`, [
        input.accountId,
        input.inviterAccountId,
      ]);

      const acc = await client.query<AccountRow>(
        `SELECT ${ACCOUNT_COLS} FROM identity.accounts WHERE id = $1`,
        [input.accountId],
      );
      const prof = await client.query<ProfileRow>(
        `SELECT ${PROFILE_COLS} FROM identity.profiles WHERE account_id = $1`,
        [input.accountId],
      );
      await client.query('COMMIT');
      return { account: toAccountDto(acc.rows[0]!), profile: toProfileDto(prof.rows[0]!) };
    } catch (e) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw e;
    } finally {
      client.release();
    }
  }
}
