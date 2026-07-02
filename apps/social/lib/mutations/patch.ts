import type { QueryClient } from '@tanstack/react-query';
import type { PostDto, PublicProfileDto } from '@osia/shared';
import { queryKeys } from '../query-keys';

/**
 * Parcheo optimista de caches (R1): tras una acción (estrella, seguir…) la UI se actualiza YA,
 * sin esperar red — el lujo se siente en la mano. Recorre TODOS los queries bajo `['social']`
 * y aplica el patch donde encuentre la entidad, sin importar la forma del cache:
 *  - un `PostDto` suelto (detalle),
 *  - páginas `Page<PostDto>` o `Page<FeedItemDto>` (post embebido), planas o infinitas,
 *  - un `PublicProfileDto` suelto o listas de `ProfileSummaryDto` (búsqueda/descubrir).
 *
 * El caller toma snapshot antes (`snapshotSocial`) y restaura en `onError` (rollback).
 * Los patches son FUNCIONES (deltas relativos), nunca valores absolutos: no pisan un contador
 * más fresco que el que vio el componente.
 */

type PostPatch = (post: PostDto) => PostDto;

function isPost(value: unknown): value is PostDto {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'reactionCount' in value &&
    'viewerReaction' in value
  );
}

/** Aplica el patch a un valor si es (o contiene) el post; devuelve el valor intacto si no. */
function patchDeep(value: unknown, postId: string, patch: PostPatch): unknown {
  if (typeof value !== 'object' || value === null) return value;

  if (isPost(value)) {
    return value.id === postId ? patch(value) : value;
  }
  // Item del feed u otro envoltorio con `post` embebido.
  if ('post' in value && isPost((value as { post: unknown }).post)) {
    const holder = value as { post: PostDto };
    return holder.post.id === postId ? { ...holder, post: patch(holder.post) } : value;
  }
  // InfiniteData: { pages: Page<T>[], pageParams }.
  if ('pages' in value && Array.isArray((value as { pages: unknown }).pages)) {
    const inf = value as { pages: unknown[] };
    return { ...inf, pages: inf.pages.map((p) => patchDeep(p, postId, patch)) };
  }
  // Page<T>: { data: T[], page }.
  if ('data' in value && Array.isArray((value as { data: unknown }).data)) {
    const page = value as { data: unknown[] };
    return { ...page, data: page.data.map((item) => patchDeep(item, postId, patch)) };
  }
  return value;
}

/** Parchea un post allí donde viva en los caches sociales (feed, detalle, posts de perfil…). */
export function patchPostInCaches(qc: QueryClient, postId: string, patch: PostPatch): void {
  qc.setQueriesData({ queryKey: queryKeys.all }, (old: unknown) => patchDeep(old, postId, patch));
}

type ProfileLike = PublicProfileDto | (PostDto['author'] & { accountId: string; viewerState: string });
type ProfilePatch = (profile: ProfileLike) => ProfileLike;

function isProfileWithViewerState(value: unknown): value is ProfileLike {
  return (
    typeof value === 'object' &&
    value !== null &&
    'accountId' in value &&
    'viewerState' in value &&
    'handle' in value
  );
}

function patchProfileDeep(value: unknown, accountId: string, patch: ProfilePatch): unknown {
  if (typeof value !== 'object' || value === null) return value;
  if (isProfileWithViewerState(value)) {
    return value.accountId === accountId ? patch(value) : value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => patchProfileDeep(item, accountId, patch));
  }
  if ('pages' in value && Array.isArray((value as { pages: unknown }).pages)) {
    const inf = value as { pages: unknown[] };
    return { ...inf, pages: inf.pages.map((p) => patchProfileDeep(p, accountId, patch)) };
  }
  if ('data' in value && Array.isArray((value as { data: unknown }).data)) {
    const page = value as { data: unknown[] };
    return { ...page, data: page.data.map((item) => patchProfileDeep(item, accountId, patch)) };
  }
  return value;
}

/** Parchea un perfil-con-relación (perfil público, búsqueda, descubrir) por `accountId`. */
export function patchProfileInCaches(qc: QueryClient, accountId: string, patch: ProfilePatch): void {
  qc.setQueriesData({ queryKey: queryKeys.all }, (old: unknown) =>
    patchProfileDeep(old, accountId, patch),
  );
}

/** Snapshot de todos los caches sociales, para restaurar en el rollback de `onError`. */
export function snapshotSocial(qc: QueryClient): Array<[readonly unknown[], unknown]> {
  return qc.getQueriesData({ queryKey: queryKeys.all });
}

/** Restaura el snapshot tomado por `snapshotSocial` (rollback tras un fallo). */
export function restoreSocial(qc: QueryClient, snapshot: Array<[readonly unknown[], unknown]>): void {
  for (const [key, data] of snapshot) {
    qc.setQueryData(key, data);
  }
}

/** Invalida (refetch de fondo) los caches que embeben posts — reconciliación tras mutar. */
export function invalidatePostBearing(qc: QueryClient): void {
  for (const key of queryKeys.postBearing) {
    void qc.invalidateQueries({ queryKey: key });
  }
}
