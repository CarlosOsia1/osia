import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_ID_COOKIE } from '@osia/shared';

/**
 * Guard de rutas (S1.6/S1.7): protege las rutas autenticadas redirigiendo a /login si NO hay cookie
 * de sesión. La cookie es HttpOnly pero el middleware (server) sí puede LEERLA. La validación real
 * del JWT la hace apps/api (AuthGuard); acá solo se chequea presencia para la UX.
 *
 * IMPORTANTE: NO se redirige /login -> / cuando hay cookie. La presencia de la cookie NO implica
 * sesión válida (puede estar stale o el backend caído); ese rebote, combinado con el redirect del
 * Vestíbulo a /login ante sesión inválida, creaba un BUCLE infinito. /login siempre es accesible.
 */
const PROTECTED = ['/passport'];

export function middleware(req: NextRequest): NextResponse {
  const hasSession = req.cookies.has(SESSION_ID_COOKIE);
  const { pathname } = req.nextUrl;

  if (!hasSession && PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/passport/:path*'],
};
