import {
  asAccountId,
  asProfileId,
  type AccountDto,
  type AccountRole,
  type AccountStatus,
  type Passport,
  type ProfileDto,
  type ProfilePrivacy,
} from '@osia/shared';

/** Mapeo de filas (snake_case) → DTOs públicos (camelCase, branded ids). Frontera web/infra. */

export type AccountRow = {
  id: string;
  email: string;
  status: AccountStatus;
  role: AccountRole;
  email_verified_at: Date | null;
  created_at: Date;
};

export const ACCOUNT_COLS = 'id, email, status, role, email_verified_at, created_at';

export function toAccountDto(row: AccountRow): AccountDto {
  return {
    accountId: asAccountId(row.id),
    email: row.email,
    status: row.status,
    role: row.role,
    emailVerified: row.email_verified_at !== null,
    createdAt: row.created_at.toISOString(),
  };
}

export type ProfileRow = {
  id: string;
  account_id: string;
  handle: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  accent_color: string;
  popularity_points: number;
  reputation: number;
  privacy: ProfilePrivacy;
  created_at: Date;
};

export const PROFILE_COLS =
  'id, account_id, handle, display_name, bio, avatar_url, accent_color, popularity_points, reputation, privacy, created_at';

export function toProfileDto(row: ProfileRow): ProfileDto {
  return {
    profileId: asProfileId(row.id),
    accountId: asAccountId(row.account_id),
    handle: row.handle,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    accentColor: row.accent_color,
    popularityPoints: row.popularity_points,
    bio: row.bio,
    reputation: row.reputation,
    privacy: row.privacy,
    createdAt: row.created_at.toISOString(),
  };
}

export type PassportRow = {
  role: AccountRole;
  email_verified_at: Date | null;
  profile_id: string;
  handle: string;
  display_name: string;
  avatar_url: string | null;
  accent_color: string;
  popularity_points: number;
  reputation: number;
};

export const PASSPORT_COLS =
  'a.role, a.email_verified_at, p.id AS profile_id, p.handle, p.display_name, p.avatar_url, p.accent_color, p.popularity_points, p.reputation';

export function toPassport(accountId: string, row: PassportRow): Passport {
  const emailVerified = row.email_verified_at !== null;
  return {
    accountId: asAccountId(accountId),
    profile: {
      profileId: asProfileId(row.profile_id),
      handle: row.handle,
      displayName: row.display_name,
      avatarUrl: row.avatar_url,
      accentColor: row.accent_color,
      popularityPoints: row.popularity_points,
      reputation: row.reputation,
    },
    role: row.role,
    // El acceso al Mundo requiere email verificado (F1-DoD-3, §8).
    scopes: emailVerified ? ['world:join'] : [],
    featureFlags: { world: emailVerified, social: false, games: false },
  };
}

/** ¿Es un error de violación de unicidad de Postgres (23505)? */
export function isUniqueViolation(e: unknown): boolean {
  return (
    typeof e === 'object' &&
    e !== null &&
    'code' in e &&
    (e as { code?: string }).code === '23505'
  );
}
