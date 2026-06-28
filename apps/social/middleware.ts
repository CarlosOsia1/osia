import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_REFRESH_COOKIE } from '@osia/shared';
import { vestibuleLoginUrl } from './lib/vestibule';

/**
 * Guard de rutas (S3.1-H1): La Red Social es privada. Sin cookie de sesión → al login del Vestíbulo
 * (apps/web) con `returnTo` a la URL pedida. La validación real del JWT la hace apps/api (AuthGuard);
 * acá solo presencia de cookie para la UX sin flash. La cookie es HttpOnly pero el middleware sí la lee.
 */
export function middleware(req: NextRequest): NextResponse {
  if (req.cookies.has(SESSION_REFRESH_COOKIE)) return NextResponse.next();
  const returnTo = `${req.nextUrl.origin}${req.nextUrl.pathname}`;
  return NextResponse.redirect(vestibuleLoginUrl(returnTo));
}

export const config = {
  // Toda la app es privada; excluye los estáticos/imágenes/fuentes de Next.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|fonts/).*)'],
};
