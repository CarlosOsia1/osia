import { SessionGuard } from './_components/SessionGuard';
import { SocialHome } from './_components/SocialHome';

/**
 * "/" (S3.1-H1) — La Red Social es privada. El `SessionGuard` (cliente) valida la sesión vía SSO contra
 * el API y manda al login del Vestíbulo si no hay; robusto en dev (puertos) y prod (subdominios). Ya NO
 * se gatea por presencia de cookie en este origen (frágil: la cookie de refresh es host-only del API).
 */
export default function HomePage() {
  return (
    <SessionGuard>
      <SocialHome />
    </SessionGuard>
  );
}
