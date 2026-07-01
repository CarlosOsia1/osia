'use client';

import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Button, EmptyState, Text, IconCompass } from '@osia/ui';
import { useOsiaSession } from '@osia/identity';
import type { FeedItemDto, Page } from '@osia/shared';
import { identity } from '../../lib/identity';
import { getFeed } from '../../lib/social-api';
import { PostCard } from './PostCard';

const FEED_KEY = ['social', 'feed'] as const;

/**
 * Feed (S3.10) — `GET /v1/feed` (cronológico inverso, cursor keyset) paginado con "ver más". Cada post
 * se pinta con `PostCard` (media foto/video, reacciones ★☾☀, comentarios inline). Reaccionar/comentar/
 * borrar invalida el feed. Compone @osia/ui + i18n; sin Three.js.
 */
export function Feed() {
  const t = useTranslations('social');
  const qc = useQueryClient();
  const viewerHandle = useOsiaSession(identity).data?.passport?.profile?.handle ?? null;

  const query = useInfiniteQuery({
    queryKey: FEED_KEY,
    queryFn: ({ pageParam }) => getFeed(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last: Page<FeedItemDto>) => last.page.nextCursor ?? undefined,
  });
  const invalidate = (): void => void qc.invalidateQueries({ queryKey: FEED_KEY });

  if (query.isPending) {
    return (
      <Text tone="muted" variant="read">
        {t('feed.loading')}
      </Text>
    );
  }
  const items = query.data?.pages.flatMap((p) => p.data) ?? [];
  if (items.length === 0) {
    return (
      <EmptyState
        icon={<IconCompass width={40} height={40} />}
        title={t('feed.emptyTitle')}
        description={t('feed.empty')}
      />
    );
  }
  return (
    <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
      {items.map((item) => (
        <PostCard key={item.id} post={item.post} viewerHandle={viewerHandle} onMutated={invalidate} />
      ))}
      {query.hasNextPage && (
        <Button variant="ghost" loading={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()}>
          {t('feed.more')}
        </Button>
      )}
    </div>
  );
}
