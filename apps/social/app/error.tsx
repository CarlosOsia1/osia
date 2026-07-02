'use client';

import { useTranslations } from 'next-intl';
import { Button, ErrorState } from '@osia/ui';

/**
 * Error boundary de ruta (R1): un crash de render/carga ya no deja la pantalla en blanco —
 * se dice la verdad con calma y se ofrece reintentar. Next lo monta DENTRO del layout (el
 * shell y los providers siguen vivos).
 */
export default function RouteError({ error, reset }: { error: Error; reset: () => void }) {
  const t = useTranslations('social');
  // La evidencia completa va a la consola (dev/observabilidad); al usuario, la salida.
  console.error(error);
  return (
    <ErrorState
      title={t('errors.crashTitle')}
      description={t('errors.crashBody')}
      action={
        <Button variant="secondary" onClick={reset}>
          {t('retry')}
        </Button>
      }
    />
  );
}
