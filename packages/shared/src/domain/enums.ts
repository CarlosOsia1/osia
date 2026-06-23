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

// --- marca en el dato ---
/** Acento por defecto del pasaporte: champán (ER §3.3 — la marca vive en el dato). */
export const ACCENT_COLOR_DEFAULT = '#CBB89A';
/** Forma válida de un `accentColor` (hex de 6 dígitos, espejo del CHECK del ER). */
export const ACCENT_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;
export const isAccentColor = (v: unknown): v is string =>
  typeof v === 'string' && ACCENT_COLOR_PATTERN.test(v);

/** Forma válida de un `handle` (ER: `^[a-z0-9_]{3,20}$`). */
export const HANDLE_PATTERN = /^[a-z0-9_]{3,20}$/;
export const isHandle = (v: unknown): v is string =>
  typeof v === 'string' && HANDLE_PATTERN.test(v);
