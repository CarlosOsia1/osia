import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SESSION_REFRESH_COOKIE } from '@osia/shared';
import { SocialHome } from './_components/SocialHome';
import { vestibuleLoginUrl } from '../lib/vestibule';

/**
 * "/" (S3.1-H1) — La Red Social es privada: solo residentes con sesión. El branch es por PRESENCIA
 * de la cookie de refresh (SSR, sin flash): si no hay, al login del Vestíbulo (el middleware también
 * lo cubre). Con cookie, render del shell, que revalida la sesión vía SSO y redirige si está stale.
 */
export default async function HomePage() {
  const hasSession = (await cookies()).has(SESSION_REFRESH_COOKIE);
  if (!hasSession) redirect(vestibuleLoginUrl());
  return <SocialHome />;
}
