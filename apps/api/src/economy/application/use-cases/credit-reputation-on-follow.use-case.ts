import { Inject, Injectable } from '@nestjs/common';
import type { SocialFollowCreatedPayload } from '@osia/shared';
import { REPUTATION_LEDGER, type ReputationLedgerPort } from '../ports/out/reputation-ledger.port';

/**
 * Acredita reputación cuando nace una arista de seguimiento (S3.2-H3). Consume `social.follow.created`
 * (vía el listener de infraestructura) y traduce el evento al ledger: el receptor del crédito es el
 * SEGUIDO; el origen para la dedup anti-grind es el SEGUIDOR. La política de "no grindeable" (una vez
 * por par) la impone el ledger; este caso de uso solo orquesta.
 */
@Injectable()
export class CreditReputationOnFollowUseCase {
  constructor(@Inject(REPUTATION_LEDGER) private readonly ledger: ReputationLedgerPort) {}

  execute(payload: SocialFollowCreatedPayload): Promise<{ credited: boolean }> {
    return this.ledger.creditNewFollower(payload.followeeAccountId, payload.followerAccountId);
  }
}
