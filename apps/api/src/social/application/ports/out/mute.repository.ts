import type { AccountBriefDto, Cursor, Page } from '@osia/shared';

export const MUTE_REPOSITORY = Symbol('MUTE_REPOSITORY');

export interface MuteRepository {
  /** Silencia a una cuenta (idempotente). `false` si el destino no existe (→ 404). */
  setMute(muterAccountId: string, mutedAccountId: string): Promise<boolean>;
  /** Quita el silencio (idempotente; quitar lo no-silenciado no es error). */
  removeMute(muterAccountId: string, mutedAccountId: string): Promise<void>;
  /** Página (keyset) de las cuentas que YO silencié (gestión propia; nadie más lo ve). */
  listMuted(accountId: string, limit: number, cursor: Cursor | null): Promise<Page<AccountBriefDto>>;
}
