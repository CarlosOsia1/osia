import type {
  Cursor,
  FollowDto,
  FollowRequestDto,
  FollowStatus,
  Page,
  ProfileBrief,
} from '@osia/shared';

export const FOLLOW_REPOSITORY = Symbol('FOLLOW_REPOSITORY');

export interface FollowRepository {
  /** Crea el follow con el `status` dado (`active` público / `pending` privado); idempotente por
   *  `(follower, followee)`. `created=false` si ya existía (se devuelve el vigente, con su estado). */
  follow(
    followerAccountId: string,
    followeeAccountId: string,
    status: FollowStatus,
  ): Promise<{ follow: FollowDto; created: boolean }>;
  /** Borra el follow; `true` si existía (lo borró), `false` si no había nada (idempotente). */
  unfollow(followerAccountId: string, followeeAccountId: string): Promise<boolean>;
  /** ¿La cuenta destino es privada? (S3.9 — decide si el follow nace `pending`). */
  isAccountPrivate(accountId: string): Promise<boolean>;
  /** Aprueba una solicitud entrante (pending→active) del `requester` hacia `owner`; `true` si había una. */
  acceptRequest(ownerAccountId: string, requesterAccountId: string): Promise<boolean>;
  /** Rechaza/cancela una solicitud entrante (borra la fila pending); `true` si había una (idempotente). */
  rejectRequest(ownerAccountId: string, requesterAccountId: string): Promise<boolean>;
  /** Página (keyset) de solicitudes ENTRANTES pendientes hacia `accountId` (solicitante + su accountId). */
  listPendingRequests(
    accountId: string,
    limit: number,
    cursor: Cursor | null,
  ): Promise<Page<FollowRequestDto>>;
  /** ¿Existe la cuenta destino (no borrada)? Para responder 404 antes de crear la arista. */
  accountExists(accountId: string): Promise<boolean>;
  /** Resuelve el `account_id` por handle (citext, case-insensitive); `null` si no existe. */
  accountIdByHandle(handle: string): Promise<string | null>;
  /** Página (keyset, más recientes primero) de quienes SIGUEN a `accountId`. */
  listFollowers(accountId: string, limit: number, cursor: Cursor | null): Promise<Page<ProfileBrief>>;
  /** Página (keyset, más recientes primero) de a quienes SIGUE `accountId`. */
  listFollowing(accountId: string, limit: number, cursor: Cursor | null): Promise<Page<ProfileBrief>>;
}
