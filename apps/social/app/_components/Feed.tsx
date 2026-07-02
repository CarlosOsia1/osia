'use client';

import { useEffect, useRef } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Button, EmptyState, ErrorState, Skeleton, IconCompass } from '@osia/ui';
import { useOsiaSession } from '@osia/identity';
import type { FeedItemDto, Page } from '@osia/shared';
import { identity } from '../../lib/identity';
import { getFeed } from '../../lib/api';
import { queryKeys } from '../../lib/query-keys';
import { PostCard } from './PostCard';
import { DiscoverInterstitial } from './DiscoverInterstitial';

/** Cada cuántos posts respira un interstitial de descubrimiento (personas para tu órbita). */
const INTERSTITIAL_EVERY = 8;

/**
 * Feed del Salón (R2) — `GET /v1/feed` (cronológico inverso, keyset) con scroll INFINITO por
 * IntersectionObserver (el «Ver más» murió), skeletons de carga, ErrorState con reintento, e
 * interstitials de descubrimiento cada 8 piezas. Cada post es un `PostCard` editorial.
 */
export function Feed() {
  const t = useTranslations('social');
  const qc = useQueryClient();
  const viewerHandle = useOsiaSession(identity).data?.passport?.profile?.handle ?? null;
  const sentinelRef = useRef<HTMLDivElement>(null);

  const query = useInfiniteQuery({
    queryKey: queryKeys.feed,
    queryFn: ({ pageParam }) => getFeed(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last: Page<FeedItemDto>) => last.page.nextCursor ?? undefined,
  });
  const invalidate = (): void => void qc.invalidateQueries({ queryKey: queryKeys.feed });

  // Scroll infinito: al asomar el centinela, pide la siguiente página. Un solo observer, limpio al salir.
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query;
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasNextPage) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && !isFetchingNextPage) void fetchNextPage();
      },
      { rootMargin: '600px 0px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (query.isPending) {
    return (
      <div className="osia-feed" aria-hidden="true">
        <Skeleton variant="block" width="100%" height="11rem" />
        <Skeleton variant="block" width="100%" height="16rem" />
        <Skeleton variant="block" width="100%" height="11rem" />
      </div>
    );
  }
  // Un API caído NO es un horizonte vacío: se dice la verdad y se ofrece salida (R1).
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
    <div className="osia-feed">
      {items.map((item, i) => (
        <div key={item.id} className="osia-feed__slot">
          <PostCard post={item.post} viewerHandle={viewerHandle} onMutated={invalidate} />
          {(i + 1) % INTERSTITIAL_EVERY === 0 && (
            <DiscoverInterstitial offset={Math.floor((i + 1) / INTERSTITIAL_EVERY) - 1} />
          )}
        </div>
      ))}
      <div ref={sentinelRef} className="osia-feed__sentinel" aria-hidden="true" />
      {isFetchingNextPage && <Skeleton variant="block" width="100%" height="11rem" />}
    </div>
  );
}
