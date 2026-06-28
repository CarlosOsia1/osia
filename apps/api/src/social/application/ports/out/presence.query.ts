import type { PresenceEntryDto } from '@osia/shared';

export const PRESENCE_QUERY = Symbol('PRESENCE_QUERY');

export interface PresenceQueryPort {
  /**
   * Presencia de las cuentas pedidas, SOLO de las que están en relación con el solicitante (las que
   * sigue o que lo siguen — privacidad por relación). Lee el checkpoint `world.presence_sessions`.
   */
  getPresence(viewerAccountId: string, accountIds: string[]): Promise<PresenceEntryDto[]>;
}
