import {
  asAccountId,
  asFollowId,
  asProfileId,
  type FollowDto,
  type FollowStatus,
  type ProfileBrief,
} from '@osia/shared';

/** Mapeo de filas `social.*` (snake_case) → DTOs públicos (camelCase, branded ids). Frontera infra/web. */

export type FollowRow = {
  id: string;
  follower_account_id: string;
  followee_account_id: string;
  status: FollowStatus;
  created_at: Date;
};

export const FOLLOW_COLS = 'id, follower_account_id, followee_account_id, status, created_at';

export function toFollowDto(row: FollowRow): FollowDto {
  return {
    id: asFollowId(row.id),
    followerAccountId: asAccountId(row.follower_account_id),
    followeeAccountId: asAccountId(row.followee_account_id),
    status: row.status,
    createdAt: row.created_at.toISOString(),
  };
}

/** Columnas de la vista pública acotada del perfil, prefijadas `p.` (para joins desde `social.*`). */
export const PROFILE_BRIEF_COLS =
  'p.id, p.handle, p.display_name, p.avatar_url, p.accent_color, p.popularity_points';

export type ProfileBriefRow = {
  id: string;
  handle: string;
  display_name: string;
  avatar_url: string | null;
  accent_color: string;
  popularity_points: number;
};

export function toProfileBrief(row: ProfileBriefRow): ProfileBrief {
  return {
    profileId: asProfileId(row.id),
    handle: row.handle,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    accentColor: row.accent_color,
    popularityPoints: row.popularity_points,
  };
}
