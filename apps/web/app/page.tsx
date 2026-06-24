import { cookies } from 'next/headers';
import { SESSION_REFRESH_COOKIE } from '@osia/shared';
import { Landing } from './_components/Landing';
import { Vestibule } from './_components/Vestibule';

/**
 * "/" (S1.7) — Vestibulo para residentes con sesion; landing publica para visitantes. El branch es
 * por PRESENCIA de la cookie de refresh (SSR, sin flash): la validacion real del JWT la hace
 * apps/api; si la cookie esta stale, el Vestibulo redirige a /login.
 */
export default async function HomePage() {
  const hasSession = (await cookies()).has(SESSION_REFRESH_COOKIE);
  return hasSession ? <Vestibule /> : <Landing />;
}
