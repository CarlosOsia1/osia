import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
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
import type { SocialEventPublisher } from '../../application/ports/out/social-event-publisher.port';

/**
 * Adapter del bus de dominio sobre `@nestjs/event-emitter` (in-process). El framework vive SOLO aquí;
 * la aplicación habla con `SocialEventPublisher`. `emit` es fire-and-forget: el caso de uso no espera a
 * los suscriptores (reputación, notificaciones), que corren desacoplados y se hacen cargo de sus errores.
 */
@Injectable()
export class EventEmitterSocialPublisher implements SocialEventPublisher {
  constructor(private readonly emitter: EventEmitter2) {}

  followCreated(payload: SocialFollowCreatedPayload): void {
    this.emitter.emit(SOCIAL_FOLLOW_CREATED, payload);
  }

  followRequested(payload: SocialFollowRequestedPayload): void {
    this.emitter.emit(SOCIAL_FOLLOW_REQUESTED, payload);
  }

  followAccepted(payload: SocialFollowAcceptedPayload): void {
    this.emitter.emit(SOCIAL_FOLLOW_ACCEPTED, payload);
  }

  postPublished(payload: SocialPostPublishedPayload): void {
    this.emitter.emit(SOCIAL_POST_PUBLISHED, payload);
  }

  postReacted(payload: SocialPostReactedPayload): void {
    this.emitter.emit(SOCIAL_POST_REACTED, payload);
  }

  postCommented(payload: SocialPostCommentedPayload): void {
    this.emitter.emit(SOCIAL_POST_COMMENTED, payload);
  }


  postEchoed(payload: SocialPostEchoedPayload): void {
    this.emitter.emit(SOCIAL_POST_ECHOED, payload);
  }}
