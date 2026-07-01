'use client';

import { useTranslations } from 'next-intl';
import { EmptyState, Text, IconUsers } from '@osia/ui';

/**
 * "/amigos" (S3.7) — tu red (Seguidores · Seguidos · Solicitudes). El shell la deja navegable; las
 * listas paginadas y las solicitudes (aceptar/rechazar) llegan en S3.9.
 */
export default function FriendsPage() {
  const t = useTranslations('social');
  return (
    <section style={{ display: 'grid', gap: 'var(--space-5)' }}>
      <Text variant="heading">{t('nav.friends')}</Text>
      <EmptyState
        icon={<IconUsers width={40} height={40} />}
        title={t('friends.soonTitle')}
        description={t('friends.soonBody')}
      />
    </section>
  );
}
