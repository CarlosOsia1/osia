'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Button, Skeleton, Text, UserRow, type AvatarPresence } from '@osia/ui';
import type { Page, ProfileBrief } from '@osia/shared';
import { routes } from '../../lib/routes';

/**
 * UserList (S3.9) — lista de personas paginada por cursor (infinite query). Genérica sobre cualquier DTO
 * que extienda ProfileBrief (seguidores, seguidos, solicitudes, sugeridos, resultados de búsqueda). Cada
 * fila es un `UserRow` de @osia/ui enlazado al perfil; `renderAction` pinta la acción a la derecha.
 */
export function UserList<T extends ProfileBrief>({
  queryKey,
  fetchPage,
  emptyLabel,
  renderAction,
  presenceOf,
}: {
  queryKey: readonly unknown[];
  fetchPage: (cursor?: string) => Promise<Page<T>>;
  emptyLabel: string;
  renderAction?: (user: T) => ReactNode;
  presenceOf?: (user: T) => AvatarPresence | undefined;
}) {
  const t = useTranslations('social');
  const q = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) => fetchPage(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last: Page<T>) => last.page.nextCursor ?? undefined,
  });

  if (q.isPending) {
    return (
      <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} variant="block" width="100%" height="4rem" />
        ))}
      </div>
    );
  }
  const users = q.data?.pages.flatMap((p) => p.data) ?? [];
  if (users.length === 0) {
    return (
      <Text variant="read" tone="muted">
        {emptyLabel}
      </Text>
    );
  }
  return (
    <div style={{ display: 'grid', gap: 'var(--space-1)' }}>
      {users.map((u) => (
        <UserRow
          key={u.profileId}
          name={u.displayName}
          handle={u.handle}
          avatarUrl={u.avatarUrl}
          presence={presenceOf?.(u)}
          href={routes.perfil(u.handle)}
          LinkComponent={Link}
        >
          {renderAction?.(u)}
        </UserRow>
      ))}
      {q.hasNextPage && (
        <div style={{ paddingBlock: 'var(--space-3)', justifySelf: 'center' }}>
          <Button variant="ghost" loading={q.isFetchingNextPage} onClick={() => void q.fetchNextPage()}>
            {t('feed.more')}
          </Button>
        </div>
      )}
    </div>
  );
}
