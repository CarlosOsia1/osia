import { SessionGuard } from '../_components/SessionGuard';
import { PostComposer } from '../_components/PostComposer';

/**
 * "/compose" (S3.3-H1) — publicar un Post. Privado: el `SessionGuard` (cliente) valida la sesión vía SSO
 * contra el API y redirige al login del Vestíbulo si no hay. El composer llama al API con el Pasaporte.
 */
export default function ComposePage() {
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
        <PostComposer />
      </main>
    </SessionGuard>
  );
}
