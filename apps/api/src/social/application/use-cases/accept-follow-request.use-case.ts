import { Inject, Injectable } from '@nestjs/common';
import { ErrorCode } from '@osia/shared';
import { AppException } from '../../../common/app-exception';
import { TX_RUNNER, type TxRunner } from '../../../common/tx';
import { FOLLOW_REPOSITORY, type FollowRepository } from '../ports/out/follow.repository';
import {
  SOCIAL_EVENT_PUBLISHER,
  type SocialEventPublisher,
} from '../ports/out/social-event-publisher.port';

/**
 * Aceptar una solicitud de seguimiento entrante (S3.9): pasa la arista `pending`→`active` (solo el DUEÑO
 * puede aceptar la suya). Al pasar a activa, emite `social.follow.accepted` → la reputación acredita al
 * seguido (dedup por par) y se notifica al solicitante. 404 si no hay solicitud pendiente de esa cuenta.
 */
@Injectable()
export class AcceptFollowRequestUseCase {
  constructor(
    @Inject(FOLLOW_REPOSITORY) private readonly follows: FollowRepository,
    @Inject(SOCIAL_EVENT_PUBLISHER) private readonly events: SocialEventPublisher,
    @Inject(TX_RUNNER) private readonly tx: TxRunner,
  ) {}

  async execute(ownerAccountId: string, requesterAccountId: string): Promise<void> {
    // Aceptar la solicitud y su `social.follow.accepted` (reputación + notificación al solicitante) van
    // en la MISMA transacción; el evento solo se encola si de verdad había una pendiente que pasó a activa.
    const accepted = await this.tx.run(async (tx) => {
      const ok = await this.follows.acceptRequest(ownerAccountId, requesterAccountId, tx);
      if (ok) {
        await this.events.followAccepted(tx, {
          followerAccountId: requesterAccountId,
          followeeAccountId: ownerAccountId,
        });
      }
      return ok;
    });
    if (!accepted) {
      throw new AppException(ErrorCode.NOT_FOUND, 404, 'No hay una solicitud pendiente de esa cuenta.');
    }
  }
}
