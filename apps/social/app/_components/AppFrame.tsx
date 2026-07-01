'use client';

import type { ReactNode } from 'react';
import { SessionGuard } from './SessionGuard';
import { SocialShell } from './SocialShell';

/**
 * AppFrame (S3.7) — envuelve TODAS las rutas: valida la sesión SSO (SessionGuard) y monta el shell de
 * lujo (SocialShell) una sola vez, de modo que header/sidebar/tab bar persisten entre navegaciones y
 * solo cambia el contenido central. Va en el layout raíz.
 */
export function AppFrame({ children }: { children: ReactNode }) {
  return (
    <SessionGuard>
      <SocialShell>{children}</SocialShell>
    </SessionGuard>
  );
}
