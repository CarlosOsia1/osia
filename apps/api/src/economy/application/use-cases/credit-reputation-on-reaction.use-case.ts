import { Inject, Injectable } from '@nestjs/common';
import type { SocialPostReactedPayload } from '@osia/shared';
import { REPUTATION_LEDGER, type ReputationLedgerPort } from '../ports/out/reputation-ledger.port';

/**
 * Acredita reputación al autor cuando recibe una reacción (S3.3-H2). Consume `social.post.reacted`. No
 * hay AUTO-crédito: reaccionar al propio post no suma. La política "una vez por (post, reactor)" la impone
 * el ledger (índice único parcial); este caso de uso solo orquesta y corta el auto-crédito.
 */
@Injectable()
export class CreditReputationOnReactionUseCase {
  constructor(@Inject(REPUTATION_LEDGER) private readonly ledger: ReputationLedgerPort) {}

  execute(payload: SocialPostReactedPayload): Promise<{ credited: boolean }> {
    if (payload.reactorAccountId === payload.postAuthorAccountId) {
      return Promise.resolve({ credited: false });
    }
    return this.ledger.creditReactionReceived(
      payload.postAuthorAccountId,
      payload.postId,
      payload.reactorAccountId,
    );
  }
}
