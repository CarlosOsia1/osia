/**
 * Pasaporte compartido (docs/10 §2.1) — el snapshot de identidad que devuelve
 * `GET /v1/auth/session` y que viaja por SSO a todas las apps del ecosistema.
 * Es deliberadamente más pequeño que el modelo de datos: solo lo público/curado.
 */

import type { AccountId, ProfileId } from '../../domain/ids';
import type { AccountRole } from '../../domain/enums';

/** Qué experiencias tiene habilitadas la cuenta (gating por fase/rol). */
export type FeatureFlags = {
  world: boolean;
  social: boolean;
  games: boolean;
};

/** Perfil embebido en el pasaporte (vista de marca, sin campos privados). */
export type PassportProfile = {
  profileId: ProfileId;
  handle: string;
  displayName: string;
  /** URL del avatar (gltf/render); `null` mientras no haya avatar activo. */
  avatarUrl: string | null;
  accentColor: string;
  popularityPoints: number;
  reputation: number;
};

/** El pasaporte: cuenta + perfil + permisos. Lo consumen el Vestíbulo y, por SSO, toda app. */
export type Passport = {
  accountId: AccountId;
  profile: PassportProfile;
  role: AccountRole;
  scopes: string[];
  featureFlags: FeatureFlags;
};
