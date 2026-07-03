import { Inject, Injectable } from '@nestjs/common';
import {
  SOCIAL_FOLLOW_ACCEPTED,
  SOCIAL_FOLLOW_CREATED,
  SOCIAL_FOLLOW_REQUESTED,
  SOCIAL_POST_COMMENTED,
  SOCIAL_POST_ECHOED,
  SOCIAL_POST_PUBLISHED,
  SOCIAL_POST_REACTED,
  type SocialFollowAcceptedPayload,
  type SocialFollowCreatedPayload,
  type SocialFollowRequestedPayload,
  type SocialPostCommentedPayload,
  type SocialPostEchoedPayload,
  type SocialPostPublishedPayload,
  type SocialPostReactedPayload,
} from '@osia/shared';
import type { Tx } from '../../../common/tx';
import type { SocialEventPublisher } from '../../application/ports/out/social-event-publisher.port';
import { OUTBOX_STORE, type OutboxStore } from '../../application/ports/out/outbox.store';

/**
 * Publicador de eventos de dominio sobre el OUTBOX transaccional (Ola 1C). Cada método encola el evento
 * en `social.outbox` usando el `Tx` del caso de uso: el evento se persiste en la MISMA transacción que el
 * write de dominio, así que no puede perderse (adiós al fire-and-forget). La entrega al bus in-process la
 * hace el `OutboxDispatcher` leyendo la tabla. El framework de bus (EventEmitter2) ya no vive aquí.
 */
@Injectable()
export class OutboxSocialPublisher implements SocialEventPublisher {
  constructor(@Inject(OUTBOX_STORE) private readonly outbox: OutboxStore) {}

  followCreated(tx: Tx, payload: SocialFollowCreatedPayload): Promise<void> {
    return this.outbox.enqueue(tx, SOCIAL_FOLLOW_CREATED, payload);
  }

  followRequested(tx: Tx, payload: SocialFollowRequestedPayload): Promise<void> {
    return this.outbox.enqueue(tx, SOCIAL_FOLLOW_REQUESTED, payload);
  }

  followAccepted(tx: Tx, payload: SocialFollowAcceptedPayload): Promise<void> {
    return this.outbox.enqueue(tx, SOCIAL_FOLLOW_ACCEPTED, payload);
  }

  postPublished(tx: Tx, payload: SocialPostPublishedPayload): Promise<void> {
    return this.outbox.enqueue(tx, SOCIAL_POST_PUBLISHED, payload);
  }

  postReacted(tx: Tx, payload: SocialPostReactedPayload): Promise<void> {
    return this.outbox.enqueue(tx, SOCIAL_POST_REACTED, payload);
  }

  postCommented(tx: Tx, payload: SocialPostCommentedPayload): Promise<void> {
    return this.outbox.enqueue(tx, SOCIAL_POST_COMMENTED, payload);
  }

  postEchoed(tx: Tx, payload: SocialPostEchoedPayload): Promise<void> {
    return this.outbox.enqueue(tx, SOCIAL_POST_ECHOED, payload);
  }
}
