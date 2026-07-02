'use client';

import { useEffect, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Button, Text } from '@osia/ui';
import { OsiaApiError, useOsiaSession } from '@osia/identity';
import { identity } from '../../lib/identity';
import { vestibuleLoginUrl } from '../../lib/vestibule';

/**
 * Guard de sesión del lado del CLIENTE (S3.1-H1, robustecido). Valida el Pasaporte vía SSO llamando al
 * API (con `credentials:include`), donde vive la cookie de refresh — así NO depende de que la cookie sea
 * legible en el origen de ESTA app. Eso funciona igual en dev (puertos `localhost`, cookie host-only del
 * API) y en prod (subdominios `.osia.*`), y evita el bucle de redirect del antiguo gate por cookie.
 *
 * Solo un 401 (no autenticado) manda al login del Vestíbulo con `returnTo`. Un 5xx o un corte de red
 * NO expulsan a un usuario CON sesión válida (perdería su navegación): se muestra un reintento.
 */
function isUnauthenticated(err: unknown): boolean {
  return err instanceof OsiaApiError && err.status === 401;
}

const centered = {
  minHeight: '100vh',
  display: 'grid',
  placeItems: 'center',
  padding: 'var(--space-7) var(--space-5)',
} as const;

export function SessionGuard({ children }: { children: ReactNode }) {
  const t = useTranslations('social');
  const session = useOsiaSession(identity);
  const unauth = session.isError && isUnauthenticated(session.error);

  useEffect(() => {
    if (unauth) window.location.href = vestibuleLoginUrl(window.location.href);
  }, [unauth]);

  if (unauth) return null; // redirigiendo al Vestíbulo (sesión ausente/expirada)

  // Error transitorio (5xx / red) con sesión posiblemente válida: no expulsar, ofrecer reintento.
  if (session.isError) {
    return (
      <main style={{ ...centered, gap: 'var(--space-4)', textAlign: 'center' }}>
        <Text tone="muted">{t('sessionError')}</Text>
        <Button onClick={() => void session.refetch()}>{t('retry')}</Button>
      </main>
    );
  }

  if (!session.data) {
    return (
      <main style={centered}>
        <Text tone="muted">{t('loading')}</Text>
      </main>
    );
  }
  return <>{children}</>;
}
