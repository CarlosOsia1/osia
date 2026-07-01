/**
 * Enums de dominio — espejo en código de los `CHECK (... in (...))` del ER (docs/04, docs/10 §6.2).
 *
 * Una sola lista de valores válidos: si se agrega un valor, se toca aquí y en la migración SQL,
 * y el `CHECK` y el tipo no pueden divergir sin que alguien lo note. Cada conjunto trae su
 * `*_VALUES` (tupla readonly) y su guard `is*()` para narrowing seguro en los bordes.
 *
 * Alcance Fase 1 (anti-alcance §12): solo identidad + world-mínimo. Los enums de social/game/
 * economy (Fase 3+) se agregan cuando su fase llegue.
 */

function makeGuard<T extends string>(values: readonly T[]): (v: unknown) => v is T {
  const set = new Set<string>(values);
  return (v: unknown): v is T => typeof v === 'string' && set.has(v);
}

// --- identity.accounts ---
export const ACCOUNT_STATUS_VALUES = ['invited', 'active', 'suspended'] as const;
export type AccountStatus = (typeof ACCOUNT_STATUS_VALUES)[number];
export const isAccountStatus = makeGuard(ACCOUNT_STATUS_VALUES);

export const ACCOUNT_ROLE_VALUES = ['member', 'admin'] as const;
export type AccountRole = (typeof ACCOUNT_ROLE_VALUES)[number];
export const isAccountRole = makeGuard(ACCOUNT_ROLE_VALUES);

// --- identity.avatars ---
export const AVATAR_KIND_VALUES = ['lowpoly', 'rpm'] as const;
export type AvatarKind = (typeof AVATAR_KIND_VALUES)[number];
export const isAvatarKind = makeGuard(AVATAR_KIND_VALUES);

// --- identity.invitations ---
export const INVITATION_STATUS_VALUES = ['pending', 'accepted', 'revoked', 'expired'] as const;
export type InvitationStatus = (typeof INVITATION_STATUS_VALUES)[number];
export const isInvitationStatus = makeGuard(INVITATION_STATUS_VALUES);

// --- identity.waitlist_entries ---
export const WAITLIST_STATUS_VALUES = ['queued', 'invited', 'joined', 'rejected'] as const;
export type WaitlistStatus = (typeof WAITLIST_STATUS_VALUES)[number];
export const isWaitlistStatus = makeGuard(WAITLIST_STATUS_VALUES);

// --- world.zones ---
export const ZONE_KIND_VALUES = ['hub', 'social', 'contemplative', 'plotfield'] as const;
export type ZoneKind = (typeof ZONE_KIND_VALUES)[number];
export const isZoneKind = makeGuard(ZONE_KIND_VALUES);

// --- world.world_instances ---
export const WORLD_INSTANCE_STATUS_VALUES = ['open', 'full', 'draining', 'closed'] as const;
export type WorldInstanceStatus = (typeof WORLD_INSTANCE_STATUS_VALUES)[number];
export const isWorldInstanceStatus = makeGuard(WORLD_INSTANCE_STATUS_VALUES);

// --- social.posts (Fase 3 — S3.1-H4; espejo ER §7.1) ---
/** Tipo de contenido del post (ER `posts.kind`). */
export const POST_KIND_VALUES = ['text', 'image', 'video', 'moment'] as const;
export type PostKind = (typeof POST_KIND_VALUES)[number];
export const isPostKind = makeGuard(POST_KIND_VALUES);

/** Visibilidad del post (ER `posts.visibility`). */
export const POST_VISIBILITY_VALUES = ['public', 'followers', 'private'] as const;
export type PostVisibility = (typeof POST_VISIBILITY_VALUES)[number];
export const isPostVisibility = makeGuard(POST_VISIBILITY_VALUES);

// --- social.reactions ---
/**
 * Reacciones dentro del gamut house-celestial (ER `reactions.kind` = `star|moon|sun`).
 * Sin emojis saturados: la marca es prestigio curado, no métricas de vanidad (backlog S3.3-H2).
 */
export const REACTION_KIND_VALUES = ['star', 'moon', 'sun'] as const;
export type ReactionKind = (typeof REACTION_KIND_VALUES)[number];
export const isReactionKind = makeGuard(REACTION_KIND_VALUES);

// --- social.follows ---
/** Estado de una arista de seguimiento (ER `follows.status`). `pending` = solicitud a cuenta privada
 *  aún sin aprobar (S3.9); no cuenta para conteos ni concede visibilidad hasta pasar a `active`. */
export const FOLLOW_STATUS_VALUES = ['active', 'pending', 'blocked'] as const;
export type FollowStatus = (typeof FOLLOW_STATUS_VALUES)[number];
export const isFollowStatus = makeGuard(FOLLOW_STATUS_VALUES);

// --- social.feed_items ---
/** Por qué un post entró al feed de alguien (ER `feed_items.reason`). */
export const FEED_REASON_VALUES = ['follow', 'trending', 'event'] as const;
export type FeedReason = (typeof FEED_REASON_VALUES)[number];
export const isFeedReason = makeGuard(FEED_REASON_VALUES);

// --- social.notifications ---
/**
 * Tipos de notificación social (espejo ER `notifications.kind`). `gossip` queda DESCARTADO
 * (IA en Habitantes descartada al 100%, CLAUDE.md): sin Habitantes no hay chisme que notificar.
 */
export const NOTIFICATION_TYPE_VALUES = [
  'follow',
  'reaction',
  'comment',
  'mention',
  'follow_request', // solicitud de seguir a tu cuenta privada (S3.9)
  'follow_accepted', // aceptaron tu solicitud (S3.9)
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPE_VALUES)[number];
export const isNotificationType = makeGuard(NOTIFICATION_TYPE_VALUES);

// --- social.reports ---
/** Qué se reporta (moderación manual, S3.6-H2; espejo del CHECK SQL). */
export const REPORT_TARGET_TYPE_VALUES = ['post', 'comment'] as const;
export type ReportTargetType = (typeof REPORT_TARGET_TYPE_VALUES)[number];
export const isReportTargetType = makeGuard(REPORT_TARGET_TYPE_VALUES);

// --- economy.reputation_ledger ---
/**
 * Razones de un asiento del `reputation_ledger` (event-sourced; espejo del CHECK SQL). El estatus solo
 * se mueve por estas razones acotadas — nunca por un número editable (backlog S3.2-H3). En H3 solo
 * `new_follower` tiene emisor; `reaction_received` (S3.3) y `event_witness` (logros Fase 2) quedan
 * declarados y se cablean en su HU.
 */
export const REPUTATION_REASON_VALUES = ['new_follower', 'reaction_received', 'event_witness'] as const;
export type ReputationReason = (typeof REPUTATION_REASON_VALUES)[number];
export const isReputationReason = makeGuard(REPUTATION_REASON_VALUES);

// --- marca en el dato ---
/** Acento por defecto del pasaporte: champán (ER §3.3 — la marca vive en el dato). */
export const ACCENT_COLOR_DEFAULT = '#CBB89A';

/**
 * Acentos PERMITIDOS del pasaporte: paleta cálida de marca (no color libre, §S1.6-H1). El editor
 * de perfil solo ofrece estos; el servidor valida pertenencia. Derivados de los primitivos (docs/02).
 */
export const ACCENT_PALETTE = [
  '#CBB89A', // champán (default)
  '#B8A07E', // champán oscuro
  '#DBCBB2', // champán claro
  '#B3A488', // taupe claro
  '#8C7B66', // taupe
  '#F5F1E8', // marfil
] as const;
export type AccentColor = (typeof ACCENT_PALETTE)[number];
/** Acento por defecto (champán): residentes sin acento elegido y entidades anónimas de F0. */
export const DEFAULT_ACCENT_COLOR: AccentColor = ACCENT_PALETTE[0];
export const isAccentInPalette = (v: unknown): v is AccentColor =>
  typeof v === 'string' && (ACCENT_PALETTE as readonly string[]).includes(v);
/** Forma válida de un `accentColor` (hex de 6 dígitos, espejo del CHECK del ER). */
export const ACCENT_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;
export const isAccentColor = (v: unknown): v is string =>
  typeof v === 'string' && ACCENT_COLOR_PATTERN.test(v);

/** Forma válida de un `handle` (ER: `^[a-z0-9_]{3,20}$`). */
export const HANDLE_PATTERN = /^[a-z0-9_]{3,20}$/;
export const isHandle = (v: unknown): v is string =>
  typeof v === 'string' && HANDLE_PATTERN.test(v);
