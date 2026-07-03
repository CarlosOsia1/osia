import type {
  SocialPostEchoedPayload,
  SocialFollowAcceptedPayload,
  SocialFollowCreatedPayload,
  SocialFollowRequestedPayload,
  SocialPostCommentedPayload,
  SocialPostPublishedPayload,
  SocialPostReactedPayload,
} from '@osia/shared';
import type { Tx } from '../../../../common/tx';

export const SOCIAL_EVENT_PUBLISHER = Symbol('SOCIAL_EVENT_PUBLISHER');

/**
 * Puerto de salida para publicar eventos de dominio del Tejido Social. Desde Ola 1C NO emite al bus
 * directamente: ENCOLA el evento en `social.outbox` usando el `Tx` del caso de uso, de modo que el evento
 * y el write de dominio son atómicos (o ambos, o ninguno). El dispatcher los entrega luego al bus
 * in-process (at-least-once). El caso de uso depende de ESTA abstracción, no del outbox ni del emisor
 * (inversión de dependencias §1.1-D); cada método conserva su payload TIPADO en el borde.
 */
export interface SocialEventPublisher {
  /** Anuncia una arista de seguimiento ACTIVA nueva (follow público directo; no el re-follow). */
  followCreated(tx: Tx, payload: SocialFollowCreatedPayload): Promise<void>;
  /** Anuncia una SOLICITUD de seguir nueva (cuenta privada); notifica al seguido, sin reputación. */
  followRequested(tx: Tx, payload: SocialFollowRequestedPayload): Promise<void>;
  /** Anuncia una solicitud ACEPTADA (pasa a activa); acredita reputación y notifica al solicitante. */
  followAccepted(tx: Tx, payload: SocialFollowAcceptedPayload): Promise<void>;
  /** Anuncia un post recién publicado (dispara el fan-out al feed). */
  postPublished(tx: Tx, payload: SocialPostPublishedPayload): Promise<void>;
  /** Anuncia una reacción NUEVA (no el re-PUT idempotente del mismo kind). */
  postReacted(tx: Tx, payload: SocialPostReactedPayload): Promise<void>;
  /** Anuncia un comentario nuevo (avisa al autor del post y a los mencionados). */
  postCommented(tx: Tx, payload: SocialPostCommentedPayload): Promise<void>;
  /** Eco nuevo (R4.3): notifica al autor del ORIGINAL. SIN reputación. */
  postEchoed(tx: Tx, payload: SocialPostEchoedPayload): Promise<void>;
}
