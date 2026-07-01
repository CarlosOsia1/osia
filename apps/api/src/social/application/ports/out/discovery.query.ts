import type { ProfileSummaryDto } from '@osia/shared';

export const DISCOVERY_QUERY = Symbol('DISCOVERY_QUERY');

/**
 * Puerto de lectura para descubrir personas (S3.11): buscar por prefijo y sugerir a quién seguir. Sin
 * IA/ML (anti-alcance): la sugerencia es por reputación/popularidad entre quienes aún no sigues.
 */
export interface DiscoveryQueryPort {
  /** Personas cuyo handle o nombre empieza por `q` (excluye al propio usuario). */
  search(viewerAccountId: string, q: string, limit: number): Promise<ProfileSummaryDto[]>;
  /** Sugeridos a seguir: populares que aún no sigues ni tienes solicitud (excluye al propio usuario). */
  suggestions(viewerAccountId: string, limit: number): Promise<ProfileSummaryDto[]>;
}
