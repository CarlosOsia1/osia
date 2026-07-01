import type {
  SocialFollowAcceptedPayload,
  SocialFollowCreatedPayload,
  SocialFollowRequestedPayload,
  SocialPostCommentedPayload,
  SocialPostPublishedPayload,
  SocialPostReactedPayload,
} from '@osia/shared';

export const SOCIAL_EVENT_PUBLISHER = Symbol('SOCIAL_EVENT_PUBLISHER');

/**
 * Puerto de salida para publicar eventos de dominio del Tejido Social en el bus interno de `apps/api`.
 * El caso de uso depende de ESTA abstracción (no de `@nestjs/event-emitter`): el adapter concreto vive
 * en `infrastructure/messaging` (inversión de dependencias §1.1-D). Cada evento se agrega a este puerto
 * en la HU que lo emite. S3.2-H3: `followCreated`; S3.3-H2: `postReacted` (ambos los consume reputación;
 * S3.4 los reusará para notificaciones).
 */
export interface SocialEventPublisher {
  /** Anuncia una arista de seguimiento ACTIVA nueva (follow público directo; no el re-follow). */
  followCreated(payload: SocialFollowCreatedPayload): void;
  /** Anuncia una SOLICITUD de seguir nueva (cuenta privada); notifica al seguido, sin reputación. */
  followRequested(payload: SocialFollowRequestedPayload): void;
  /** Anuncia una solicitud ACEPTADA (pasa a activa); acredita reputación y notifica al solicitante. */
  followAccepted(payload: SocialFollowAcceptedPayload): void;
  /** Anuncia un post recién publicado (dispara el fan-out al feed). */
  postPublished(payload: SocialPostPublishedPayload): void;
  /** Anuncia una reacción NUEVA (no el re-PUT idempotente del mismo kind). */
  postReacted(payload: SocialPostReactedPayload): void;
  /** Anuncia un comentario nuevo (avisa al autor del post y a los mencionados). */
  postCommented(payload: SocialPostCommentedPayload): void;
}
