import { Inject, Injectable } from '@nestjs/common';
import { ErrorCode, type FollowDto } from '@osia/shared';
import { AppException } from '../../../common/app-exception';
import { FOLLOW_REPOSITORY, type FollowRepository } from '../ports/out/follow.repository';
import {
  SOCIAL_EVENT_PUBLISHER,
  type SocialEventPublisher,
} from '../ports/out/social-event-publisher.port';

/**
 * Seguir a otra cuenta (S3.2-H1). Idempotente (re-seguir devuelve el follow vigente, sin error),
 * con anti-self (`CANNOT_FOLLOW_SELF`, respaldado por `ck_follows_no_self`) y 404 si el destino no
 * existe. Al nacer una arista NUEVA (no en el re-follow) emite `social.follow.created`, que la
 * reputación consume para acreditar al seguido (S3.2-H3) y, más adelante, la notificación (S3.4).
 */
@Injectable()
export class FollowAccountUseCase {
  constructor(
    @Inject(FOLLOW_REPOSITORY) private readonly follows: FollowRepository,
    @Inject(SOCIAL_EVENT_PUBLISHER) private readonly events: SocialEventPublisher,
  ) {}

  async execute(followerAccountId: string, followeeAccountId: string): Promise<FollowDto> {
    if (followerAccountId === followeeAccountId) {
      throw new AppException(ErrorCode.CANNOT_FOLLOW_SELF, 422, 'No puedes seguirte a ti mismo.');
    }
    if (!(await this.follows.accountExists(followeeAccountId))) {
      throw new AppException(ErrorCode.NOT_FOUND, 404, 'La cuenta a seguir no existe.');
    }
    const { follow, created } = await this.follows.follow(followerAccountId, followeeAccountId);
    // Solo la arista nueva acredita/notifica: el re-follow idempotente no debe re-disparar nada.
    if (created) {
      this.events.followCreated({ followerAccountId, followeeAccountId });
    }
    return follow;
  }
}
