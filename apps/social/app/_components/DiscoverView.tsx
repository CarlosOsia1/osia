'use client';

import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { EmptyState, Skeleton, Text, UserRow, IconCompass } from '@osia/ui';
import { getSuggestions } from '../../lib/social-api';
import { FollowButton } from './FollowButton';

/**
 * DiscoverView (S3.11) — a quién seguir: residentes populares que aún no sigues (sin IA/ML). Cada fila
 * enlaza al perfil con un botón de seguir; tras seguir, refresca la lista. Compone @osia/ui + i18n.
 */
export function DiscoverView() {
  const t = useTranslations('social');
  const qc = useQueryClient();
  const key = ['social', 'discover'] as const;
  const q = useQuery({ queryKey: key, queryFn: getSuggestions });
  const invalidate = (): void => void qc.invalidateQueries({ queryKey: key });
  const people = q.data ?? [];

  return (
    <section style={{ display: 'grid', gap: 'var(--space-5)' }}>
      <Text variant="heading">{t('nav.discover')}</Text>
      {q.isPending ? (
        <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} variant="block" width="100%" height="4rem" />
          ))}
        </div>
      ) : people.length === 0 ? (
        <EmptyState
          icon={<IconCompass width={40} height={40} />}
          title={t('discover.emptyTitle')}
          description={t('discover.emptyBody')}
        />
      ) : (
        <div style={{ display: 'grid', gap: 'var(--space-1)' }}>
          {people.map((u) => (
            <UserRow
              key={u.profileId}
              name={u.displayName}
              handle={u.handle}
              avatarUrl={u.avatarUrl}
              href={`/profile/${u.handle}`}
              LinkComponent={Link}
            >
              <FollowButton accountId={u.accountId} viewerState={u.viewerState} onChanged={invalidate} />
            </UserRow>
          ))}
        </div>
      )}
    </section>
  );
}
