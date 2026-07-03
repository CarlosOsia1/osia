import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  SOCIAL_FOLLOW_ACCEPTED,
  SOCIAL_FOLLOW_CREATED,
  SOCIAL_FOLLOW_REQUESTED,
  SOCIAL_POST_COMMENTED,
  SOCIAL_POST_ECHOED,
  SOCIAL_POST_REACTED,
  type SocialFollowAcceptedPayload,
  type SocialFollowCreatedPayload,
  type SocialFollowRequestedPayload,
  type SocialPostCommentedPayload,
  type SocialPostEchoedPayload,
  type SocialPostReactedPayload,
} from '@osia/shared';
import { CreateNotificationUseCase } from '../../application/use-cases/create-notification.use-case';

/**
 * Traduce eventos `social.*` a notificaciones (S3.4-H2). Decide destinatarios y evita la
 * auto-notificación (no te avisas de tu propia acción). Los eventos llegan por el OUTBOX (Ola 1C): si
 * algo falla NO se traga el error — se propaga para que el dispatcher reintente. La creación es
 * idempotente (id determinista), así que un reintento no duplica.
 */
@Injectable()
export class NotificationListener {
  constructor(private readonly createNotification: CreateNotificationUseCase) {}

  @OnEvent(SOCIAL_FOLLOW_CREATED)
  onFollow(p: SocialFollowCreatedPayload): Promise<void> {
    // El follow ya es anti-self (no puede seguirse a sí mismo), así que nunca es auto-notificación.
    return this.createNotification.execute(p.followeeAccountId, 'follow', p.followerAccountId, {});
  }

  @OnEvent(SOCIAL_FOLLOW_REQUESTED)
  onFollowRequested(p: SocialFollowRequestedPayload): Promise<void> {
    // Cuenta privada: avisa al seguido que hay una solicitud (el actor es quien la pide).
    return this.createNotification.execute(p.followeeAccountId, 'follow_request', p.followerAccountId, {});
  }

  @OnEvent(SOCIAL_FOLLOW_ACCEPTED)
  onFollowAccepted(p: SocialFollowAcceptedPayload): Promise<void> {
    // Al aceptar, se avisa al SOLICITANTE (follower); el actor es el dueño que aceptó (followee).
    return this.createNotification.execute(p.followerAccountId, 'follow_accepted', p.followeeAccountId, {});
  }

  @OnEvent(SOCIAL_POST_REACTED)
  async onReacted(p: SocialPostReactedPayload): Promise<void> {
    if (p.reactorAccountId === p.postAuthorAccountId) return; // auto-reacción: no notifica
    await this.createNotification.execute(p.postAuthorAccountId, 'reaction', p.reactorAccountId, {
      postId: p.postId,
      kind: p.kind,
    });
  }

  @OnEvent(SOCIAL_POST_ECHOED)
  async onEchoed(p: SocialPostEchoedPayload): Promise<void> {
    if (p.echoAuthorAccountId === p.originalAuthorAccountId) return; // auto-eco: no notifica
    await this.createNotification.execute(p.originalAuthorAccountId, 'echo', p.echoAuthorAccountId, {
      postId: p.originalPostId,
      echoPostId: p.echoPostId,
    });
  }

  @OnEvent(SOCIAL_POST_COMMENTED)
  async onCommented(p: SocialPostCommentedPayload): Promise<void> {
    const payload = { postId: p.postId, commentId: p.commentId };
    if (p.commenterAccountId !== p.postAuthorAccountId) {
      await this.createNotification.execute(p.postAuthorAccountId, 'comment', p.commenterAccountId, payload);
    }
    // `mentionedAccountIds` ya viene sin el comentador ni el autor (filtrado en el caso de uso).
    for (const mentioned of p.mentionedAccountIds) {
      await this.createNotification.execute(mentioned, 'mention', p.commenterAccountId, payload);
    }
  }
}
