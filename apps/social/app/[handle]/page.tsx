import { SessionGuard } from '../_components/SessionGuard';
import { ProfileView } from '../_components/ProfileView';

/**
 * "/{handle}" (S3.5-H1) — perfil público de un residente. Privado como toda La Red Social: el
 * `SessionGuard` valida la sesión. Las rutas estáticas (`/`, `/compose`) tienen prioridad sobre este
 * dinámico, así que solo captura handles.
 */
export default async function ProfilePage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  return (
    <SessionGuard>
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
        <ProfileView handle={handle} />
      </main>
    </SessionGuard>
  );
}
