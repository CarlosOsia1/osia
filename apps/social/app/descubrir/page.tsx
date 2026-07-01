'use client';

import { useTranslations } from 'next-intl';
import { EmptyState, Text, IconCompass } from '@osia/ui';

/**
 * "/descubrir" (S3.7) — a quién seguir. El shell la deja navegable desde ya; los sugeridos (por
 * reputación + 2º grado + nuevos, sin IA/ML) y su backend llegan en S3.11.
 */
export default function DiscoverPage() {
  const t = useTranslations('social');
  return (
    <section style={{ display: 'grid', gap: 'var(--space-5)' }}>
      <Text variant="heading">{t('nav.discover')}</Text>
      <EmptyState
        icon={<IconCompass width={40} height={40} />}
        title={t('discover.soonTitle')}
        description={t('discover.soonBody')}
      />
    </section>
  );
}
