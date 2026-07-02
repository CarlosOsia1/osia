'use client';

import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Avatar, Text } from '@osia/ui';
import { getSuggestions } from '../../lib/api';
import { queryKeys } from '../../lib/query-keys';
import { routes } from '../../lib/routes';
import { FollowButton } from './FollowButton';

/**
 * Sugerencias en el rail (R2): un vistazo de a quién seguir (sin IA/ML — reputación), con el
 * botón de seguir optimista. La exploración completa vive en Descubrir.
 */
export function RailSuggestions() {
  const t = useTranslations('social');
  const qc = useQueryClient();
  const q = useQuery({ queryKey: queryKeys.discover, queryFn: getSuggestions });

  const people = (q.data ?? []).slice(0, 5);
  if (people.length === 0) return null;

  return (
    <section className="osia-railcard" aria-label={t('rail.suggestionsTitle')}>
      <div className="osia-railcard__head">
        <Text variant="overline" tone="subtle">
          {t('rail.suggestionsTitle')}
        </Text>
        <Link href={routes.descubrir} className="osia-railcard__link">
          <Text variant="caption" tone="accent" as="span">
            {t('rail.seeAll')}
          </Text>
        </Link>
      </div>
      <div className="osia-railcard__list">
        {people.map((u) => (
          <div key={u.accountId} className="osia-railrequest">
            <Link href={routes.perfil(u.handle)} className="osia-railpresence">
              <Avatar src={u.avatarUrl} name={u.displayName} size={34} />
            </Link>
            <span className="osia-railrequest__meta">
              <Text variant="meta" as="span">
                {u.displayName}
              </Text>
              <Text variant="caption" tone="subtle" as="span">
                {`@${u.handle}`}
              </Text>
            </span>
            <FollowButton
              accountId={u.accountId}
              viewerState={u.viewerState}
              onChanged={() => void qc.invalidateQueries({ queryKey: queryKeys.discover })}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
