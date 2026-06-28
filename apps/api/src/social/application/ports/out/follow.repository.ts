import type { Cursor, FollowDto, Page, ProfileBrief } from '@osia/shared';

export const FOLLOW_REPOSITORY = Symbol('FOLLOW_REPOSITORY');

export interface FollowRepository {
  /** Crea el follow; idempotente por `(follower, followee)` (`uq_follows_pair`). `created=false`
   *  si ya existía (se devuelve el vigente). */
  follow(
    followerAccountId: string,
    followeeAccountId: string,
  ): Promise<{ follow: FollowDto; created: boolean }>;
  /** Borra el follow; `true` si existía (lo borró), `false` si no había nada (idempotente). */
  unfollow(followerAccountId: string, followeeAccountId: string): Promise<boolean>;
  /** ¿Existe la cuenta destino (no borrada)? Para responder 404 antes de crear la arista. */
  accountExists(accountId: string): Promise<boolean>;
  /** Resuelve el `account_id` por handle (citext, case-insensitive); `null` si no existe. */
  accountIdByHandle(handle: string): Promise<string | null>;
  /** Página (keyset, más recientes primero) de quienes SIGUEN a `accountId`. */
  listFollowers(accountId: string, limit: number, cursor: Cursor | null): Promise<Page<ProfileBrief>>;
  /** Página (keyset, más recientes primero) de a quienes SIGUE `accountId`. */
  listFollowing(accountId: string, limit: number, cursor: Cursor | null): Promise<Page<ProfileBrief>>;
}
