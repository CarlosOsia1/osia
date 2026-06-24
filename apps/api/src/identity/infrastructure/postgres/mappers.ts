import {
  asAccountId,
  asProfileId,
  type AccountDto,
  type AccountRole,
  type AccountStatus,
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

/** ¿Es un error de violación de unicidad de Postgres (23505)? */
export function isUniqueViolation(e: unknown): boolean {
  return (
    typeof e === 'object' &&
    e !== null &&
    'code' in e &&
    (e as { code?: string }).code === '23505'
  );
}
