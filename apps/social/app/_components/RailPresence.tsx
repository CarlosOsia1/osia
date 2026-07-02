'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Avatar, Text } from '@osia/ui';
import { getNetworkPresence } from '../../lib/api';
import { queryKeys } from '../../lib/query-keys';
import { routes } from '../../lib/routes';
import { worldBaseUrl } from '../../lib/vestibule';

/**
 * «En El Mundo ahora» (R2 — rail del Salón): quién de tu red camina el Mundo en este momento
 * (presencia direccional: te ven quienes sigues… te muestra a quienes TE siguen). Cada fila
 * lleva a su perfil; el pie invita a viajar al Mundo. Polling sereno (45 s) — el rail respira,
 * no vibra. Si nadie está, el card lo dice con calma (la ausencia también es atmósfera).
 */
export function RailPresence() {
  const t = useTranslations('social');
  const q = useQuery({
    queryKey: [...queryKeys.all, 'network-presence'],
    queryFn: getNetworkPresence,
    refetchInterval: 45_000,
  });

  return (
    <section className="osia-railcard" aria-label={t('rail.presenceTitle')}>
      <div className="osia-railcard__head">
        <Text variant="overline" tone="subtle">
          {t('rail.presenceTitle')}
        </Text>
        <a href={worldBaseUrl()} className="osia-railcard__link">
          <Text variant="caption" tone="accent" as="span">
            {t('rail.travel')}
          </Text>
        </a>
      </div>
      {q.isPending ? null : !q.data || q.data.length === 0 ? (
        <Text variant="caption" tone="muted">
          {t('rail.presenceEmpty')}
        </Text>
      ) : (
        <div className="osia-railcard__list">
          {q.data.map((entry) => (
            <Link key={entry.accountId} href={routes.perfil(entry.profile.handle)} className="osia-railpresence">
              <Avatar
                src={entry.profile.avatarUrl}
                name={entry.profile.displayName}
                size={34}
                presence="online"
              />
              <span className="osia-railpresence__meta">
                <Text variant="meta" as="span">
                  {entry.profile.displayName}
                </Text>
                <Text variant="caption" tone="subtle" as="span">
                  {entry.zone}
                </Text>
              </span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
