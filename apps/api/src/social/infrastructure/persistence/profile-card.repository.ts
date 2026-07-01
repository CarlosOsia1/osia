import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL } from '../../../identity/infrastructure/postgres/postgres.tokens';
import type {
  ProfileCardPatch,
  ProfileCardRepository,
} from '../../application/ports/out/profile-card.repository';

/**
 * Adapter de `social.profile_cards` (S3.8). Upsert dinámico: solo escribe las columnas presentes en el
 * parche (distingue `undefined` = sin cambio de `null` = limpiar, vía `'campo' in patch`). `updated_at`
 * lo mantiene el trigger `trg_profile_cards_updated`.
 */
@Injectable()
export class PgProfileCardRepository implements ProfileCardRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async upsert(accountId: string, patch: ProfileCardPatch): Promise<void> {
    const cols = ['account_id'];
    const vals: unknown[] = [accountId];
    const setters: string[] = [];
    if (patch.isPrivate !== undefined) {
      vals.push(patch.isPrivate);
      cols.push('is_private');
      setters.push('is_private = EXCLUDED.is_private');
    }
    if ('photoUrl' in patch) {
      vals.push(patch.photoUrl ?? null);
      cols.push('photo_url');
      setters.push('photo_url = EXCLUDED.photo_url');
    }
    if ('coverUrl' in patch) {
      vals.push(patch.coverUrl ?? null);
      cols.push('cover_url');
      setters.push('cover_url = EXCLUDED.cover_url');
    }
    const placeholders = vals.map((_, i) => `$${i + 1}`).join(', ');
    const onConflict = setters.length ? `DO UPDATE SET ${setters.join(', ')}` : 'DO NOTHING';
    await this.pool.query(
      `INSERT INTO social.profile_cards (${cols.join(', ')}) VALUES (${placeholders})
       ON CONFLICT (account_id) ${onConflict}`,
      vals,
    );
  }
}
