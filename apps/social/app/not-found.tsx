'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button, EmptyState, IconCompass } from '@osia/ui';

/**
 * 404 de la app (R1): una URL rota no es un fallo del sistema — se recibe con la calma del
 * vacío editorial (constelación) y una salida al inicio.
 */
export default function NotFound() {
  const t = useTranslations('social');
  const router = useRouter();
  return (
    <EmptyState
      icon={<IconCompass width={40} height={40} />}
      title={t('errors.notFoundTitle')}
      description={t('errors.notFoundBody')}
      action={
        <Button variant="secondary" onClick={() => router.push('/')}>
          {t('errors.goHome')}
        </Button>
      }
    />
  );
}
