import { Inject, Injectable } from '@nestjs/common';
import type { PresenceEntryDto, PresenceQueryInput } from '@osia/shared';
import { PRESENCE_QUERY, type PresenceQueryPort } from '../ports/out/presence.query';

/**
 * Presencia social (S3.4-H1): quién de los pedidos está online y en qué zona, filtrado por relación
 * (sigue / lo siguen). Los `accountIds` ya vienen validados (UUID, CSV) por Zod.
 */
@Injectable()
export class GetPresenceUseCase {
  constructor(@Inject(PRESENCE_QUERY) private readonly presence: PresenceQueryPort) {}

  execute(viewerAccountId: string, query: PresenceQueryInput): Promise<PresenceEntryDto[]> {
    return this.presence.getPresence(viewerAccountId, query.accountIds);
  }
}
