'use client';

import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Avatar, Text } from '@osia/ui';
import { getSuggestions } from '../../lib/api';
import { queryKeys } from '../../lib/query-keys';
import { routes } from '../../lib/routes';
import { FollowButton } from './FollowButton';

/** Cuántas personas muestra cada interstitial. */
const WINDOW = 4;

/**
 * Interstitial de descubrimiento (R2): entre piezas del feed, una fila serena de «personas
 * cerca de tu órbita» (sin IA — reputación). `offset` rota la ventana para que dos
 * interstitials seguidos no repitan caras. Comparte cache con Descubrir y el rail.
 */
export function DiscoverInterstitial({ offset = 0 }: { offset?: number }) {
  const t = useTranslations('social');
  const qc = useQueryClient();
  const q = useQuery({ queryKey: queryKeys.discover, queryFn: getSuggestions });

  const all = q.data ?? [];
  if (all.length === 0) return null;
  const start = (offset * WINDOW) % all.length;
  const people = [...all, ...all].slice(start, start + Math.min(WINDOW, all.length));

  return (
    <aside className="osia-interstitial" aria-label={t('rail.suggestionsTitle')}>
      <div className="osia-railcard__head">
        <Text variant="overline" tone="subtle">
          {t('discoverInterstitial.title')}
        </Text>
        <Link href={routes.descubrir} className="osia-railcard__link">
          <Text variant="caption" tone="accent" as="span">
            {t('rail.seeAll')}
          </Text>
        </Link>
      </div>
      <div className="osia-interstitial__row">
        {people.map((u) => (
          <div key={u.accountId} className="osia-interstitial__person">
            <Link href={routes.perfil(u.handle)}>
              <Avatar src={u.avatarUrl} name={u.displayName} size={56} ring />
              <Text variant="meta" as="span">
                {u.displayName}
              </Text>
              <Text variant="caption" tone="subtle" as="span">
                {`@${u.handle}`}
              </Text>
            </Link>
            <FollowButton
              accountId={u.accountId}
              viewerState={u.viewerState}
              onChanged={() => void qc.invalidateQueries({ queryKey: queryKeys.discover })}
            />
          </div>
        ))}
      </div>
    </aside>
  );
}
