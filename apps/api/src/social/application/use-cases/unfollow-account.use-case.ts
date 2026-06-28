import { Inject, Injectable } from '@nestjs/common';
import { FOLLOW_REPOSITORY, type FollowRepository } from '../ports/out/follow.repository';

/**
 * Dejar de seguir (S3.2-H1). Idempotente: si no había arista, no es error (204 igual). Borra la fila
 * (el ER no usa soft-delete en `follows`; `status` queda para bloqueo futuro).
 */
@Injectable()
export class UnfollowAccountUseCase {
  constructor(@Inject(FOLLOW_REPOSITORY) private readonly follows: FollowRepository) {}

  async execute(followerAccountId: string, followeeAccountId: string): Promise<void> {
    await this.follows.unfollow(followerAccountId, followeeAccountId);
  }
}
