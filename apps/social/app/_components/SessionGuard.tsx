'use client';

import { useEffect, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Text } from '@osia/ui';
import { useOsiaSession } from '@osia/identity';
import { identity } from '../../lib/identity';
import { vestibuleLoginUrl } from '../../lib/vestibule';

/**
 * Guard de sesión del lado del CLIENTE (S3.1-H1, robustecido). Valida el Pasaporte vía SSO llamando al
 * API (con `credentials:include`), donde vive la cookie de refresh — así NO depende de que la cookie sea
 * legible en el origen de ESTA app. Eso funciona igual en dev (puertos `localhost`, cookie host-only del
 * API) y en prod (subdominios `.osia.*`), y evita el bucle de redirect del antiguo gate por cookie en el
 * propio origen (el mismo que `apps/web` documenta haber sufrido). Sin sesión → login del Vestíbulo con
 * `returnTo` a la URL actual.
 */
export function SessionGuard({ children }: { children: ReactNode }) {
  const t = useTranslations('social');
  const session = useOsiaSession(identity);

  useEffect(() => {
    if (session.isError) window.location.href = vestibuleLoginUrl(window.location.href);
  }, [session.isError]);

  if (session.isError) return null; // redirigiendo al Vestíbulo
  if (!session.data) {
    return (
      <main
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          padding: 'var(--space-7) var(--space-5)',
        }}
      >
        <Text tone="muted">{t('loading')}</Text>
      </main>
    );
  }
  return <>{children}</>;
}
