import {
  followRequestDtoSchema,
  followResponseSchema,
  pageOf,
  profileBriefSchema,
  type FollowRequestDto,
  type Page,
  type ProfileBrief,
} from '@osia/shared';
import { apiCall, apiVoid, pageQs } from './client';

/** Grafo de seguidores: seguir/dejar de seguir, listas y solicitudes (S3.2, S3.9). */

/** Seguir (`POST /v1/follows`), idempotente. Con cuenta privada crea una solicitud `pending`. */
export async function followAccount(followeeAccountId: string): Promise<void> {
  await apiCall('/v1/follows', followResponseSchema, {
    method: 'POST',
    body: { followeeAccountId },
  });
}

/** Dejar de seguir (`DELETE /v1/follows/{id}`), idempotente. También cancela una solicitud pendiente. */
export function unfollowAccount(followeeAccountId: string): Promise<void> {
  return apiVoid(`/v1/follows/${followeeAccountId}`, { method: 'DELETE' });
}

/** Seguidores de un perfil (`GET /v1/profiles/{handle}/followers`), keyset. */
export function getFollowers(handle: string, cursor?: string): Promise<Page<ProfileBrief>> {
  return apiCall(
    `/v1/profiles/${encodeURIComponent(handle)}/followers${pageQs(cursor)}`,
    pageOf(profileBriefSchema),
  );
}

/** Seguidos de un perfil (`GET /v1/profiles/{handle}/following`), keyset. */
export function getFollowing(handle: string, cursor?: string): Promise<Page<ProfileBrief>> {
  return apiCall(
    `/v1/profiles/${encodeURIComponent(handle)}/following${pageQs(cursor)}`,
    pageOf(profileBriefSchema),
  );
}

/** Solicitudes de seguimiento ENTRANTES pendientes (`GET /v1/follows/requests`), keyset. */
export function getFollowRequests(cursor?: string): Promise<Page<FollowRequestDto>> {
  return apiCall(`/v1/follows/requests${pageQs(cursor)}`, pageOf(followRequestDtoSchema));
}

/** Aceptar una solicitud (`POST /v1/follows/requests/{requesterId}/accept`). */
export function acceptFollowRequest(requesterId: string): Promise<void> {
  return apiVoid(`/v1/follows/requests/${requesterId}/accept`, { method: 'POST', body: {} });
}

/** Rechazar una solicitud (`POST /v1/follows/requests/{requesterId}/reject`). */
export function rejectFollowRequest(requesterId: string): Promise<void> {
  return apiVoid(`/v1/follows/requests/${requesterId}/reject`, { method: 'POST', body: {} });
}
