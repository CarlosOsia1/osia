'use client';

import type { ReactNode } from 'react';
import { SessionGuard } from './SessionGuard';
import { SalonShell } from './SalonShell';

/**
 * AppFrame (S3.7; Salón desde R2) — envuelve TODAS las rutas: valida la sesión SSO
 * (SessionGuard) y monta el Salón (SalonShell) una sola vez, de modo que header/sidebar/rail/
 * tab bar persisten entre navegaciones y solo cambia el contenido central. Va en el layout raíz.
 */
export function AppFrame({ children }: { children: ReactNode }) {
  return (
    <SessionGuard>
      <SalonShell>{children}</SalonShell>
    </SessionGuard>
  );
}
