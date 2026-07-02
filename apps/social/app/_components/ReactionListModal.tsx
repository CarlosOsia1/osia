'use client';

import Link from 'next/link';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Button, Modal, Skeleton, Text, UserRow } from '@osia/ui';
import type { Page, ReactionActorDto } from '@osia/shared';
import { getReactions } from '../../lib/api';
import { routes } from '../../lib/routes';

/** ReactionListModal (S3.10) — quién reaccionó a un post, paginado, con el tipo de reacción por fila. */
export function ReactionListModal({ postId, onClose }: { postId: string; onClose: () => void }) {
  const t = useTranslations('social');
  const q = useInfiniteQuery({
    queryKey: ['social', 'reactions', postId],
    queryFn: ({ pageParam }) => getReactions(postId, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (l: Page<ReactionActorDto>) => l.page.nextCursor ?? undefined,
  });
  const users = q.data?.pages.flatMap((p) => p.data) ?? [];
  return (
    <Modal open onClose={onClose} title={t('post.reactionsTitle')}>
      <div style={{ display: 'grid', gap: 'var(--space-1)', minInlineSize: 'min(20rem, 70vw)' }}>
        {q.isPending ? (
          Array.from({ length: 4 }, (_, i) => <Skeleton key={i} variant="block" width="100%" height="3.5rem" />)
        ) : users.length === 0 ? (
          <Text variant="read" tone="muted">
            {t('post.noReactions')}
          </Text>
        ) : (
          users.map((u) => (
            <UserRow
              key={u.profileId}
              name={u.displayName}
              handle={u.handle}
              avatarUrl={u.avatarUrl}
              href={routes.perfil(u.handle)}
              LinkComponent={Link}
            />
          ))
        )}
        {q.hasNextPage && (
          <Button variant="ghost" size="sm" loading={q.isFetchingNextPage} onClick={() => void q.fetchNextPage()}>
            {t('feed.more')}
          </Button>
        )}
      </div>
    </Modal>
  );
}
