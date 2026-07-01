'use client';

import Link from 'next/link';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Button, Card, Text } from '@osia/ui';
import type { FeedItemDto, Page, ReactionKind } from '@osia/shared';
import { getFeed, removeReaction, setReaction } from '../../lib/social-api';

const FEED_KEY = ['social', 'feed'] as const;

/**
 * Feed (S3.3-H4): lee `GET /v1/feed` (cronológico inverso, cursor keyset) y lo pagina con "ver más".
 * Cada post permite reaccionar con estrella (PUT/DELETE idempotente) e invalida el feed al cambiar.
 * Todo el texto pasa por `Text`/i18n; estilos por tokens (§2.1/§3). Sin Three.js.
 */
export function Feed() {
  const t = useTranslations('social');
  const qc = useQueryClient();

  const query = useInfiniteQuery({
    queryKey: FEED_KEY,
    queryFn: ({ pageParam }) => getFeed(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last: Page<FeedItemDto>) => last.page.nextCursor ?? undefined,
  });

  const star = useMutation({
    mutationFn: async ({ postId, current }: { postId: string; current: ReactionKind | null }) => {
      if (current === 'star') await removeReaction(postId, 'star');
      else await setReaction(postId, 'star');
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: FEED_KEY }),
  });

  if (query.isPending) {
    return <Text tone="muted">{t('feed.loading')}</Text>;
  }

  const items = query.data?.pages.flatMap((p) => p.data) ?? [];
  if (items.length === 0) {
    return <Text tone="muted">{t('feed.empty')}</Text>;
  }

  return (
    <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
      {items.map((item) => (
        <Card key={item.id} pad>
          <article style={{ display: 'grid', gap: 'var(--space-2)' }}>
            <Link href={`/profile/${item.post.author.handle}`} style={{ textDecoration: 'none', justifySelf: 'start' }}>
              <Text variant="label" tone="accent">
                {item.post.author.displayName}
              </Text>
            </Link>
            {item.post.body && <Text variant="body">{item.post.body}</Text>}
            {item.post.media.map((url) => (
              <img key={url} src={url} alt="" style={{ maxWidth: '100%', borderRadius: 'var(--radius-2, 8px)' }} />
            ))}
            <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', flexWrap: 'wrap' }}>
              <Button
                type="button"
                size="sm"
                variant={item.post.viewerReaction === 'star' ? 'primary' : 'ghost'}
                active={item.post.viewerReaction === 'star'}
                aria-pressed={item.post.viewerReaction === 'star'}
                loading={star.isPending}
                onClick={() => star.mutate({ postId: item.post.id, current: item.post.viewerReaction })}
              >
                {t('feed.star', { count: item.post.reactionCount })}
              </Button>
              <Text variant="label" tone="subtle">
                {t('feed.comments', { count: item.post.commentCount })}
              </Text>
            </div>
          </article>
        </Card>
      ))}
      {query.hasNextPage && (
        <Button
          type="button"
          variant="ghost"
          loading={query.isFetchingNextPage}
          onClick={() => void query.fetchNextPage()}
        >
          {t('feed.more')}
        </Button>
      )}
    </div>
  );
}
