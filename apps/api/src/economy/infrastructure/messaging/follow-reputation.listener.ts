import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  SOCIAL_FOLLOW_ACCEPTED,
  SOCIAL_FOLLOW_CREATED,
  type SocialFollowAcceptedPayload,
  type SocialFollowCreatedPayload,
} from '@osia/shared';
import { CreditReputationOnFollowUseCase } from '../../application/use-cases/credit-reputation-on-follow.use-case';

/**
 * Adapter de entrada por eventos: traduce la aparición de una arista ACTIVA de seguimiento en una
 * acreditación de reputación (S3.2-H3, S3.9). Consume `social.follow.created` (follow público directo) y
 * `social.follow.accepted` (solicitud privada aprobada): ambos significan "el seguido ganó un seguidor
 * activo" → acredita al seguido (dedup por par en el ledger, así que aceptar tras solicitar no duplica).
 * Desacopla `social` de `economy`. `emit` es fire-and-forget: ABSORBE sus errores (el ledger es la fuente
 * de verdad y el backfill reconcilia el caché).
 */
@Injectable()
export class FollowReputationListener {
  private readonly logger = new Logger(FollowReputationListener.name);

  constructor(private readonly creditReputation: CreditReputationOnFollowUseCase) {}

  @OnEvent(SOCIAL_FOLLOW_CREATED)
  onFollowCreated(payload: SocialFollowCreatedPayload): Promise<void> {
    return this.credit(payload, SOCIAL_FOLLOW_CREATED);
  }

  @OnEvent(SOCIAL_FOLLOW_ACCEPTED)
  onFollowAccepted(payload: SocialFollowAcceptedPayload): Promise<void> {
    return this.credit(payload, SOCIAL_FOLLOW_ACCEPTED);
  }

  private async credit(payload: SocialFollowCreatedPayload, event: string): Promise<void> {
    try {
      await this.creditReputation.execute(payload);
    } catch (err) {
      this.logger.warn(
        `No se pudo acreditar reputación por ${event} (seguido=${payload.followeeAccountId}): ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }
}
