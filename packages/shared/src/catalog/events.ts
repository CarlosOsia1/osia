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
  'social.follow.created',
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
