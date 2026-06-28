import { Inject, Injectable } from '@nestjs/common';
import { ErrorCode, type FollowDto } from '@osia/shared';
import { AppException } from '../../../common/app-exception';
import { FOLLOW_REPOSITORY, type FollowRepository } from '../ports/out/follow.repository';

/**
 * Seguir a otra cuenta (S3.2-H1). Idempotente (re-seguir devuelve el follow vigente, sin error),
 * con anti-self (`CANNOT_FOLLOW_SELF`, respaldado por `ck_follows_no_self`) y 404 si el destino no
 * existe. La acreditación de reputación al seguido y la notificación llegan en S3.2-H3 / S3.4 (vía
 * evento `social.follow.created`, que se cablea cuando exista su consumidor).
 */
@Injectable()
export class FollowAccountUseCase {
  constructor(@Inject(FOLLOW_REPOSITORY) private readonly follows: FollowRepository) {}

  async execute(followerAccountId: string, followeeAccountId: string): Promise<FollowDto> {
    if (followerAccountId === followeeAccountId) {
      throw new AppException(ErrorCode.CANNOT_FOLLOW_SELF, 422, 'No puedes seguirte a ti mismo.');
    }
    if (!(await this.follows.accountExists(followeeAccountId))) {
      throw new AppException(ErrorCode.NOT_FOUND, 404, 'La cuenta a seguir no existe.');
    }
    const { follow } = await this.follows.follow(followerAccountId, followeeAccountId);
    return follow;
  }
}
