import type { WaitlistEntryDto } from '@osia/shared';

/** Port de salida del repositorio de waitlist (driven adapter en infrastructure). */
export const WAITLIST_REPOSITORY = Symbol('WAITLIST_REPOSITORY');

export type WaitlistUpsert = {
  email: string;
  source?: string;
  meta?: Record<string, unknown>;
};

export interface WaitlistRepository {
  /** Alta idempotente por email; `created=false` si el email ya estaba en la cola. */
  upsertByEmail(input: WaitlistUpsert): Promise<{ entry: WaitlistEntryDto; created: boolean }>;
}
