import { Inject, Injectable } from '@nestjs/common';
import type { NetworkPresenceEntryDto } from '@osia/shared';
import { PRESENCE_QUERY, type PresenceQueryPort } from '../ports/out/presence.query';

/**
 * «En El Mundo ahora» (R2 — rail del Salón): quién de tu red está online, resuelto server-side
 * (tus seguidores activos ∩ sesiones abiertas) en una sola consulta. El tope es fijo: el rail es
 * un vistazo, no una lista infinita (la red completa vive en Amigos).
 */
export const NETWORK_PRESENCE_LIMIT = 12;

@Injectable()
export class GetNetworkPresenceUseCase {
  constructor(@Inject(PRESENCE_QUERY) private readonly presence: PresenceQueryPort) {}

  execute(viewerAccountId: string): Promise<NetworkPresenceEntryDto[]> {
    return this.presence.getNetworkPresence(viewerAccountId, NETWORK_PRESENCE_LIMIT);
  }
}
