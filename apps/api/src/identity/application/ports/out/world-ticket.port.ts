import type { WorldTicketClaims } from '@osia/shared';

/** Port de emisión del world ticket (firma HS256 compartida con el world-server). */
export const WORLD_TICKET_PORT = Symbol('WORLD_TICKET_PORT');

export type { WorldTicketClaims };

export interface WorldTicketPort {
  issue(claims: WorldTicketClaims): Promise<{ ticket: string; expiresIn: number }>;
}
