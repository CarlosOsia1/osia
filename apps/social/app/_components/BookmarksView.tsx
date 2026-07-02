'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Button, EmptyState, ErrorState, Skeleton, IconBookmark } from '@osia/ui';
import { useOsiaSession } from '@osia/identity';
import type { Page, PostDto } from '@osia/shared';
import { identity } from '../../lib/identity';
import { getBookmarks } from '../../lib/api';
import { queryKeys } from '../../lib/query-keys';
import { PostCard } from './PostCard';

/**
 * Guardados (R4.2) — tu colección PRIVADA: los posts que marcaste, por recencia del guardado.
 * Un guardado cuyo post se volvió invisible (cuenta que pasó a privada, post borrado) no se
 * lista — el servidor reimpone la visibilidad. Quitar el marcador lo saca de aquí.
 */
export function BookmarksView() {
  const t = useTranslations('social');
  const viewerHandle = useOsiaSession(identity).data?.passport?.profile?.handle ?? null;

  const query = useInfiniteQuery({
    queryKey: queryKeys.bookmarks,
    queryFn: ({ pageParam }) => getBookmarks(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last: Page<PostDto>) => last.page.nextCursor ?? undefined,
  });

  if (query.isPending) {
    return (
      <div className="osia-feed" aria-hidden="true">
        <Skeleton variant="block" width="100%" height="11rem" />
        <Skeleton variant="block" width="100%" height="11rem" />
      </div>
    );
  }
  if (query.isError) {
    return (
      <ErrorState
        title={t('errors.loadTitle')}
        description={t('errors.loadBody')}
        action={
          <Button variant="secondary" onClick={() => void query.refetch()}>
            {t('retry')}
          </Button>
        }
      />
    );
  }
  const posts = query.data?.pages.flatMap((p) => p.data) ?? [];
  if (posts.length === 0) {
    return (
      <EmptyState
        icon={<IconBookmark width={40} height={40} />}
        title={t('bookmarks.emptyTitle')}
        description={t('bookmarks.emptyBody')}
      />
    );
  }
  return (
    <div className="osia-feed">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} viewerHandle={viewerHandle} />
      ))}
      {query.hasNextPage && (
        <Button variant="ghost" loading={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()}>
          {t('feed.more')}
        </Button>
      )}
    </div>
  );
}
