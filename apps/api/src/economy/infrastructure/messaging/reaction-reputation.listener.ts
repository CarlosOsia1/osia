import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { SOCIAL_POST_REACTED, type SocialPostReactedPayload } from '@osia/shared';
import { CreditReputationOnReactionUseCase } from '../../application/use-cases/credit-reputation-on-reaction.use-case';

/**
 * Adapter de entrada por eventos: traduce `social.post.reacted` a una acreditación de reputación al autor
 * (S3.3-H2). Desacopla `social` de `economy`. Como el publicador usa `emit` (fire-and-forget), ABSORBE
 * sus errores: el ledger es la fuente de verdad y el backfill reconcilia el caché; un fallo aquí no debe
 * tumbar el proceso ni la reacción ya confirmada.
 */
@Injectable()
export class ReactionReputationListener {
  private readonly logger = new Logger(ReactionReputationListener.name);

  constructor(private readonly creditReputation: CreditReputationOnReactionUseCase) {}

  @OnEvent(SOCIAL_POST_REACTED)
  async onPostReacted(payload: SocialPostReactedPayload): Promise<void> {
    try {
      await this.creditReputation.execute(payload);
    } catch (err) {
      this.logger.warn(
        `No se pudo acreditar reputación por ${SOCIAL_POST_REACTED} (autor=${payload.postAuthorAccountId}): ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }
}
