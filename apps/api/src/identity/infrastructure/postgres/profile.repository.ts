import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import type { ProfileDto, UpdateProfileInput } from '@osia/shared';
import { PG_POOL } from './postgres.tokens';
import type { ProfileRepository } from '../../application/ports/out/profile.repository';
import { PROFILE_COLS, toProfileDto, type ProfileRow } from './mappers';

@Injectable()
export class PgProfileRepository implements ProfileRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async getMine(accountId: string): Promise<ProfileDto | null> {
    const res = await this.pool.query<ProfileRow>(
      `SELECT ${PROFILE_COLS} FROM identity.profiles WHERE account_id = $1 AND deleted_at IS NULL`,
      [accountId],
    );
    return res.rows[0] ? toProfileDto(res.rows[0]) : null;
  }

  async update(accountId: string, patch: UpdateProfileInput): Promise<ProfileDto> {
    const sets: string[] = [];
    const values: string[] = [];
    let i = 1;
    if (patch.displayName !== undefined) {
      sets.push(`display_name = $${i++}`);
      values.push(patch.displayName);
    }
    if (patch.bio !== undefined) {
      sets.push(`bio = $${i++}`);
      values.push(patch.bio);
    }
    if (patch.accentColor !== undefined) {
      sets.push(`accent_color = $${i++}`);
      values.push(patch.accentColor);
    }
    if (patch.prefs !== undefined) {
      // Mezcla sobre el jsonb existente (no reemplaza): claves omitidas se conservan.
      sets.push(`prefs = prefs || $${i++}::jsonb`);
      values.push(JSON.stringify(patch.prefs));
    }

    if (sets.length === 0) {
      const current = await this.getMine(accountId);
      if (!current) throw new Error('perfil no encontrado');
      return current;
    }

    values.push(accountId);
    const res = await this.pool.query<ProfileRow>(
      `UPDATE identity.profiles SET ${sets.join(', ')}
       WHERE account_id = $${i} AND deleted_at IS NULL
       RETURNING ${PROFILE_COLS}`,
      values,
    );
    if (!res.rows[0]) throw new Error('perfil no encontrado');
    return toProfileDto(res.rows[0]);
  }
}
