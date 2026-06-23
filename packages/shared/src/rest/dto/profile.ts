/**
 * DTOs de perfil (docs/10 §2.2; ER §3.3). Dos vistas: pública acotada (`ProfileBrief`,
 * respeta `privacy`/RLS) y propia/privada (`ProfileDto`, incluye bio/privacy).
 *
 * `privacy` es el jsonb del ER (`{"profile":"members","presence":"followers"}` por defecto);
 * el gamut exacto de valores se cierra junto a la migración en S1.2.
 */

import type { AccountId, ProfileId } from '../../domain/ids';

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

/** Vista pública acotada de un perfil (`GET /v1/profiles/{handle}`). */
export type ProfileBrief = {
  profileId: ProfileId;
  handle: string;
  displayName: string;
  avatarUrl: string | null;
  accentColor: string;
  popularityPoints: number;
};

/** Vista propia/privada (`GET /v1/profiles/me`): suma bio, reputación y privacidad. */
export type ProfileDto = ProfileBrief & {
  accountId: AccountId;
  bio: string | null;
  reputation: number;
  privacy: ProfilePrivacy;
  /** ISO-8601 UTC (docs/10 §1.7). */
  createdAt: string;
};
