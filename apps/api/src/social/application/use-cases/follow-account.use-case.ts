import { Inject, Injectable } from '@nestjs/common';
import { ErrorCode, type FollowDto } from '@osia/shared';
import { AppException } from '../../../common/app-exception';
import { FOLLOW_REPOSITORY, type FollowRepository } from '../ports/out/follow.repository';
import {
  SOCIAL_EVENT_PUBLISHER,
  type SocialEventPublisher,
} from '../ports/out/social-event-publisher.port';

/**
 * Seguir a otra cuenta (S3.2-H1, extendido en S3.9). Idempotente (re-seguir devuelve el vigente),
 * anti-self (`CANNOT_FOLLOW_SELF`) y 404 si el destino no existe. Según la privacidad del destino:
 * - cuenta PÚBLICA → arista `active` inmediata; al nacer emite `social.follow.created` (reputación +
 *   notificación "te empezó a seguir").
 * - cuenta PRIVADA → arista `pending` (solicitud); al nacer emite `social.follow.requested`
 *   (notificación "solicitó seguirte", SIN reputación hasta que se acepte).
 * El re-follow idempotente no re-dispara nada.
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
    const isPrivate = await this.follows.isAccountPrivate(followeeAccountId);
    const { follow, created } = await this.follows.follow(
      followerAccountId,
      followeeAccountId,
      isPrivate ? 'pending' : 'active',
    );
    if (created) {
      if (isPrivate) this.events.followRequested({ followerAccountId, followeeAccountId });
      else this.events.followCreated({ followerAccountId, followeeAccountId });
    }
    return follow;
  }
}
