/**
 * Catálogo declarativo de eventos de dominio del Tejido Social (Fase 3 — S3.1-H4; docs/10 §3).
 *
 * Son los nombres canónicos del bus de dominio interno de `apps/api`: el publicador (caso de uso) y
 * los suscriptores (fan-out, notificaciones, reputación) comparten ESTA lista, no strings sueltos.
 * Agregar un evento = agregar una entrada aquí (datos, no código), igual que `experiences.ts`.
 *
 * `social.gossip.published` queda DESCARTADO: la IA en Habitantes está descartada al 100%
 * (CLAUDE.md) — sin Habitantes no hay chisme que publicar.
 */

import type { ReactionKind } from '../domain/enums';

/** Nombres canónicos de los eventos `social.*` (orden estable). */
export const SOCIAL_EVENTS = [
  'social.post.published',
  'social.post.reacted',
  'social.post.commented',
  'social.post.echoed',
  'social.follow.created',
  'social.follow.requested',
  'social.follow.accepted',
  'social.follow.removed',
  'social.notification.created',
] as const;

/** Un nombre de evento social válido. */
export type SocialEventName = (typeof SOCIAL_EVENTS)[number];

const SOCIAL_EVENT_SET: ReadonlySet<string> = new Set(SOCIAL_EVENTS);

/** Guard de narrowing: ¿este string es un evento social conocido? */
export function isSocialEvent(value: unknown): value is SocialEventName {
  return typeof value === 'string' && SOCIAL_EVENT_SET.has(value);
}

/** Nombre del evento de arista nueva (handle tipado para publicador y suscriptor; sin string suelto). */
export const SOCIAL_FOLLOW_CREATED = 'social.follow.created' satisfies SocialEventName;

/**
 * Payload de `social.follow.created`: SOLO aristas nuevas (no el re-follow idempotente). Lo consume la
 * reputación (acreditar al seguido, S3.2-H3) y, más adelante, las notificaciones (S3.4). El receptor de
 * la reputación es `followeeAccountId`; el origen para la dedup anti-grind es `followerAccountId`.
 */
export interface SocialFollowCreatedPayload {
  followerAccountId: string;
  followeeAccountId: string;
}

/** Nombre del evento de SOLICITUD de seguir (cuenta privada, S3.9). Lo consume la notificación
 *  (`follow_request` al seguido); NO acredita reputación (la arista aún no es activa). */
export const SOCIAL_FOLLOW_REQUESTED = 'social.follow.requested' satisfies SocialEventName;
export interface SocialFollowRequestedPayload {
  followerAccountId: string;
  followeeAccountId: string;
}

/** Nombre del evento de solicitud ACEPTADA (S3.9). La arista pasa a activa: lo consume la reputación
 *  (acredita al seguido, dedup por par) y la notificación (`follow_accepted` al solicitante). */
export const SOCIAL_FOLLOW_ACCEPTED = 'social.follow.accepted' satisfies SocialEventName;
export interface SocialFollowAcceptedPayload {
  followerAccountId: string;
  followeeAccountId: string;
}

/** Nombre del evento de post publicado (handle tipado para publicador y suscriptor). */
export const SOCIAL_POST_PUBLISHED = 'social.post.published' satisfies SocialEventName;

/**
 * Payload de `social.post.published`: un post recién creado. Lo consume el fan-out-on-write (materializa
 * `feed_items` para el autor y sus seguidores, S3.3-H4). `createdAt` se usa como orden del feed.
 */
export interface SocialPostPublishedPayload {
  postId: string;
  authorAccountId: string;
  createdAt: string;
}

/** Nombre del evento de eco (R4.3): alguien amplificó un post. Lo consume la notificación
 *  (`echo` al autor del ORIGINAL). SIN reputación (anti-grind, decisión de Carlos). */
export const SOCIAL_POST_ECHOED = 'social.post.echoed' satisfies SocialEventName;
export interface SocialPostEchoedPayload {
  /** El eco recién creado. */
  echoPostId: string;
  /** El post ORIGINAL amplificado y su autor (receptor de la notificación). */
  originalPostId: string;
  originalAuthorAccountId: string;
  echoAuthorAccountId: string;
}

/** Nombre del evento de comentario nuevo (handle tipado para publicador y suscriptor). */
export const SOCIAL_POST_COMMENTED = 'social.post.commented' satisfies SocialEventName;

/**
 * Payload de `social.post.commented`: un comentario nuevo. Lo consumen las notificaciones (S3.4): avisa
 * al AUTOR del post y a las cuentas MENCIONADAS (`@handle` ya resueltas a accountId, sin el comentador
 * ni el autor, que reciben su propio aviso). Sin auto-notificación.
 */
export interface SocialPostCommentedPayload {
  postId: string;
  postAuthorAccountId: string;
  commenterAccountId: string;
  commentId: string;
  mentionedAccountIds: string[];
}

/** Nombre del evento de reacción nueva (handle tipado para publicador y suscriptor). */
export const SOCIAL_POST_REACTED = 'social.post.reacted' satisfies SocialEventName;

/**
 * Payload de `social.post.reacted`: SOLO reacciones nuevas (no el re-PUT idempotente del mismo kind). Lo
 * consume la reputación (acreditar `reaction_received` al AUTOR del post, S3.3-H2) y, más adelante, las
 * notificaciones (S3.4). La dedup anti-grind acredita una vez por (post, reactor); no hay auto-crédito
 * (si `reactorAccountId === postAuthorAccountId` no se acredita).
 */
export interface SocialPostReactedPayload {
  postId: string;
  postAuthorAccountId: string;
  reactorAccountId: string;
  kind: ReactionKind;
}
