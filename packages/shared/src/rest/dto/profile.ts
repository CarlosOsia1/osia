/**
 * DTOs de perfil (docs/10 §2.2; ER §3.3). Dos vistas: pública acotada (`ProfileBrief`,
 * respeta `privacy`/RLS) y propia/privada (`ProfileDto`, incluye bio/privacy).
 *
 * `privacy` es el jsonb del ER (`{"profile":"members","presence":"followers"}` por defecto);
 * el gamut exacto de valores se cierra junto a la migración en S1.2.
 */

import type { AccountId, ProfileId } from '../../domain/ids';

/** Tope de caracteres de la bio (espejo del CHECK del ER y del schema Zod de identidad). */
export const PROFILE_BIO_MAX = 280;

export type ProfileVisibility = 'public' | 'members' | 'private';
export type PresenceVisibility = 'public' | 'followers' | 'private';

export type ProfilePrivacy = {
  profile: ProfileVisibility;
  presence: PresenceVisibility;
};

/** Default de marca del ER: el perfil es visible para members; la presencia, para followers. */
export const PROFILE_PRIVACY_DEFAULT: ProfilePrivacy = {
  profile: 'members',
  presence: 'followers',
};

/** Override de movimiento reducido (S1.6-H3): seguir al SO, forzar reducido, o permitir animación. */
export type ReducedMotionPref = 'system' | 'reduce' | 'allow';

/** Preferencias del residente (jsonb `prefs` en `profiles`). Las respeta el theme provider y el
 *  sound engine en todas las apps. `micOptIn` habilita la voz P2P en El Mundo (push-to-talk). */
export type ProfilePrefs = {
  sound: boolean;
  /** Volumen maestro 0..1. */
  volume: number;
  reducedMotion: ReducedMotionPref;
  micOptIn: boolean;
};

export const PROFILE_PREFS_DEFAULT: ProfilePrefs = {
  sound: true,
  volume: 0.7,
  reducedMotion: 'system',
  micOptIn: false,
};

/** Vista pública acotada de un perfil (`GET /v1/profiles/{handle}`). */
export type ProfileBrief = {
  profileId: ProfileId;
  handle: string;
  displayName: string;
  avatarUrl: string | null;
  accentColor: string;
  popularityPoints: number;
};

/** Vista propia/privada (`GET /v1/profiles/me`): suma bio, reputación, privacidad y preferencias. */
export type ProfileDto = ProfileBrief & {
  accountId: AccountId;
  bio: string | null;
  reputation: number;
  privacy: ProfilePrivacy;
  prefs: ProfilePrefs;
  /** ISO-8601 UTC (docs/10 §1.7). */
  createdAt: string;
};
