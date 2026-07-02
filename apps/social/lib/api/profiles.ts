import {
  pageOf,
  postDtoSchema,
  publicProfileResponseSchema,
  type Page,
  type PostDto,
  type PublicProfileDto,
  type UpdateProfileCardInput,
} from '@osia/shared';
import { apiCall, apiVoid, pageQs } from './client';

/** Perfil público con estatus y su contenido (S3.5-H1, S3.8). */

/** Perfil público con estatus (`GET /v1/profiles/{handle}`). */
export async function getPublicProfile(handle: string): Promise<PublicProfileDto> {
  const { profile } = await apiCall(
    `/v1/profiles/${encodeURIComponent(handle)}`,
    publicProfileResponseSchema,
  );
  return profile;
}

/** Posts de un perfil (`GET /v1/profiles/{handle}/posts`), por cursor. */
export function getProfilePosts(handle: string, cursor?: string): Promise<Page<PostDto>> {
  return apiCall(
    `/v1/profiles/${encodeURIComponent(handle)}/posts${pageQs(cursor)}`,
    pageOf(postDtoSchema),
  );
}

/** Actualiza la tarjeta social propia (`PATCH /v1/profiles/me/card`): privacidad y/o foto/portada. */
export function updateProfileCard(input: UpdateProfileCardInput): Promise<void> {
  return apiVoid('/v1/profiles/me/card', { method: 'PATCH', body: input });
}

/** Edita la bio propia reusando el endpoint de identidad (`PATCH /v1/profiles/me`). */
export function updateBio(bio: string): Promise<void> {
  return apiVoid('/v1/profiles/me', { method: 'PATCH', body: { bio } });
}
