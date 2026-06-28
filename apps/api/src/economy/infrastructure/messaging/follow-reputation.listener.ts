import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { SOCIAL_FOLLOW_CREATED, type SocialFollowCreatedPayload } from '@osia/shared';
import { CreditReputationOnFollowUseCase } from '../../application/use-cases/credit-reputation-on-follow.use-case';

/**
 * Adapter de entrada por eventos: traduce `social.follow.created` del bus interno a una acreditación de
 * reputación (S3.2-H3). Desacopla `social` de `economy` (el grafo no sabe de reputación). Como el
 * publicador usa `emit` (fire-and-forget), este listener ABSORBE sus propios errores: el ledger es la
 * fuente de verdad y el backfill reconcilia el caché; un fallo aquí no debe tumbar el proceso ni el
 * follow que ya se confirmó.
 */
@Injectable()
export class FollowReputationListener {
  private readonly logger = new Logger(FollowReputationListener.name);

  constructor(private readonly creditReputation: CreditReputationOnFollowUseCase) {}

  @OnEvent(SOCIAL_FOLLOW_CREATED)
  async onFollowCreated(payload: SocialFollowCreatedPayload): Promise<void> {
    try {
      await this.creditReputation.execute(payload);
    } catch (err) {
      this.logger.warn(
        `No se pudo acreditar reputación por ${SOCIAL_FOLLOW_CREATED} (seguido=${payload.followeeAccountId}): ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }
}
