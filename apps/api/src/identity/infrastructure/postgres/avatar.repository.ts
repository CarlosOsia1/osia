import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import type { AvatarDto, UpdateAvatarInput } from '@osia/shared';
import { PG_POOL } from './postgres.tokens';
import type { AvatarRepository } from '../../application/ports/out/avatar.repository';
import { AVATAR_COLS, toAvatarDto, type AvatarRow } from './mappers';

@Injectable()
export class PgAvatarRepository implements AvatarRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async getActive(accountId: string): Promise<AvatarDto | null> {
    const res = await this.pool.query<AvatarRow>(
      `SELECT ${AVATAR_COLS} FROM identity.avatars WHERE account_id = $1 AND is_active = true`,
      [accountId],
    );
    return res.rows[0] ? toAvatarDto(res.rows[0]) : null;
  }

  async updateActiveConfig(accountId: string, patch: UpdateAvatarInput): Promise<AvatarDto> {
    const res = await this.pool.query<AvatarRow>(
      `UPDATE identity.avatars SET config = config || $2::jsonb
       WHERE account_id = $1 AND is_active = true
       RETURNING ${AVATAR_COLS}`,
      [accountId, JSON.stringify(patch)],
    );
    if (!res.rows[0]) throw new Error('avatar activo no encontrado');
    return toAvatarDto(res.rows[0]);
  }
}
