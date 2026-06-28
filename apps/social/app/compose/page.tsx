import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SESSION_REFRESH_COOKIE } from '@osia/shared';
import { PostComposer } from '../_components/PostComposer';
import { vestibuleLoginUrl } from '../../lib/vestibule';

/**
 * "/compose" (S3.3-H1) — publicar un Post. Privado como toda La Red Social: el branch es por PRESENCIA
 * de la cookie de refresh (SSR, sin flash); sin cookie, al login del Vestíbulo. Con cookie, render del
 * composer (que llama al API con el pasaporte SSO y maneja el 401 si la sesión está stale).
 */
export default async function ComposePage() {
  const hasSession = (await cookies()).has(SESSION_REFRESH_COOKIE);
  if (!hasSession) redirect(vestibuleLoginUrl());
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        alignContent: 'start',
        maxWidth: '48rem',
        margin: '0 auto',
        padding: 'var(--space-7) var(--space-5)',
      }}
    >
      <PostComposer />
    </main>
  );
}
