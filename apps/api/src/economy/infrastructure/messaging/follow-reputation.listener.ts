import { Injectable } from '@nestjs/common';
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
 * Desacopla `social` de `economy`. El evento llega por el OUTBOX (Ola 1C): NO se traga el error — se
 * propaga para que el dispatcher reintente; el crédito es idempotente, así que un reintento no duplica.
 */
@Injectable()
export class FollowReputationListener {
  constructor(private readonly creditReputation: CreditReputationOnFollowUseCase) {}

  @OnEvent(SOCIAL_FOLLOW_CREATED)
  async onFollowCreated(payload: SocialFollowCreatedPayload): Promise<void> {
    await this.creditReputation.execute(payload);
  }

  @OnEvent(SOCIAL_FOLLOW_ACCEPTED)
  async onFollowAccepted(payload: SocialFollowAcceptedPayload): Promise<void> {
    await this.creditReputation.execute(payload);
  }
}
