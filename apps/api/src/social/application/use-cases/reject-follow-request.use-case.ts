import { Inject, Injectable } from '@nestjs/common';
import { FOLLOW_REPOSITORY, type FollowRepository } from '../ports/out/follow.repository';

/**
 * Rechazar una solicitud de seguimiento entrante (S3.9): borra la arista `pending`. Idempotente (si no
 * había, no pasa nada) y silencioso (no se notifica al solicitante un rechazo). Solo el DUEÑO la rechaza.
 */
@Injectable()
export class RejectFollowRequestUseCase {
  constructor(@Inject(FOLLOW_REPOSITORY) private readonly follows: FollowRepository) {}

  async execute(ownerAccountId: string, requesterAccountId: string): Promise<void> {
    await this.follows.rejectRequest(ownerAccountId, requesterAccountId);
  }
}
