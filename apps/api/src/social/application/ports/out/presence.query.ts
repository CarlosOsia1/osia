import type { NetworkPresenceEntryDto, PresenceEntryDto } from '@osia/shared';

export const PRESENCE_QUERY = Symbol('PRESENCE_QUERY');

export interface PresenceQueryPort {
  /**
   * Presencia de las cuentas pedidas, SOLO de las que están en relación con el solicitante (las que
   * sigue o que lo siguen — privacidad por relación). Lee el checkpoint `world.presence_sessions`.
   */
  getPresence(viewerAccountId: string, accountIds: string[]): Promise<PresenceEntryDto[]>;

  /**
   * Quién de la red del solicitante está EN EL MUNDO ahora (rail del Salón, R2): cuentas online que
   * LO SIGUEN (regla direccional S3.9), con brief + zona, resuelto server-side en una consulta.
   * Ordenado por entrada al Mundo más reciente; máximo `limit`.
   */
  getNetworkPresence(viewerAccountId: string, limit: number): Promise<NetworkPresenceEntryDto[]>;
}
