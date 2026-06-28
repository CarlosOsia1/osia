import type { Cursor, Page, PostDto, PublicProfileDto } from '@osia/shared';

export const PROFILE_QUERY = Symbol('PROFILE_QUERY');

export interface ProfileQueryPort {
  /** Perfil público enriquecido por handle + si el solicitante lo sigue. `null` si no existe → 404. */
  getPublicProfile(handle: string, viewerAccountId: string): Promise<PublicProfileDto | null>;

  /** Posts del perfil, visibles para el solicitante, por cursor keyset. `null` si el handle no existe. */
  listProfilePosts(
    handle: string,
    viewerAccountId: string,
    limit: number,
    cursor: Cursor | null,
  ): Promise<Page<PostDto> | null>;
}
