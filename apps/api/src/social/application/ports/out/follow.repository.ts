import type {
  AccountBriefDto,
  Cursor,
  FollowDto,
  FollowRequestDto,
  Page,
  ProfileBrief,
} from '@osia/shared';

export const FOLLOW_REPOSITORY = Symbol('FOLLOW_REPOSITORY');

export interface FollowRepository {
  /** Crea el follow decidiendo el `status` en la MISMA sentencia según la privacidad del destino
   *  (`pending` si es privado, `active` si no) — sin TOCTOU entre leer is_private e insertar.
   *  Idempotente por `(follower, followee)`; `created=false` si ya existía (devuelve el vigente con
   *  su estado real, que el llamador usa para decidir el evento a emitir). `null` si el par está
   *  BLOQUEADO en cualquier dirección (R4.4) → 403 en el caso de uso, sin oráculo. */
  follow(
    followerAccountId: string,
    followeeAccountId: string,
  ): Promise<{ follow: FollowDto; created: boolean } | null>;
  /** Borra el follow (`active`/`pending`; jamás deshace un bloqueo); `true` si existía (idempotente). */
  unfollow(followerAccountId: string, followeeAccountId: string): Promise<boolean>;
  /** Bloquea (R4.4), atómico e idempotente: mi arista pasa a `blocked`, la inversa muere y los
   *  feeds de ambos quedan limpios del otro. */
  block(blockerAccountId: string, blockedAccountId: string): Promise<void>;
  /** Desbloquea (borra MI arista `blocked`); no restaura follows. `true` si había bloqueo. */
  unblock(blockerAccountId: string, blockedAccountId: string): Promise<boolean>;
  /** Página (keyset) de las cuentas que YO bloqueé (gestión propia). */
  listBlocked(accountId: string, limit: number, cursor: Cursor | null): Promise<Page<AccountBriefDto>>;
  /** ¿La cuenta destino es privada? (S3.9 — decide si el follow nace `pending`). */
  isAccountPrivate(accountId: string): Promise<boolean>;
  /** ¿`followerAccountId` sigue ACTIVAMENTE a `followeeAccountId`? (para gatear listas de cuenta privada). */
  isActiveFollower(followerAccountId: string, followeeAccountId: string): Promise<boolean>;
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
