import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { SOCIAL_POST_REACTED, type SocialPostReactedPayload } from '@osia/shared';
import { CreditReputationOnReactionUseCase } from '../../application/use-cases/credit-reputation-on-reaction.use-case';

/**
 * Adapter de entrada por eventos: traduce `social.post.reacted` a una acreditación de reputación al autor
 * (S3.3-H2). Desacopla `social` de `economy`. El evento llega por el OUTBOX (Ola 1C): NO se traga el error
 * — se propaga para que el dispatcher reintente. El crédito es idempotente (source_ref determinista, dedup
 * por (post, reactor)), así que un reintento no acredita dos veces.
 */
@Injectable()
export class ReactionReputationListener {
  constructor(private readonly creditReputation: CreditReputationOnReactionUseCase) {}

  @OnEvent(SOCIAL_POST_REACTED)
  async onPostReacted(payload: SocialPostReactedPayload): Promise<void> {
    await this.creditReputation.execute(payload);
  }
}
