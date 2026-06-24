import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_REFRESH_COOKIE } from '@osia/shared';

/**
 * Guard de rutas (S1.6/S1.7): protege las rutas autenticadas redirigiendo a /login si no hay cookie
 * de sesión, y manda al Vestíbulo (/) a quien ya tiene sesión y visita /login. La cookie es HttpOnly
 * pero el middleware (server) sí puede LEERLA. La validación real del JWT la hace apps/api
 * (AuthGuard); acá solo se chequea presencia para la UX.
 */
const PROTECTED = ['/passport'];
const GUEST_ONLY = ['/login'];

export function middleware(req: NextRequest): NextResponse {
  const hasSession = req.cookies.has(SESSION_REFRESH_COOKIE);
  const { pathname } = req.nextUrl;

  if (!hasSession && PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }
  if (hasSession && GUEST_ONLY.includes(pathname)) {
    const url = req.nextUrl.clone();
    url.pathname = '/'; // ya tiene sesión -> al Vestíbulo
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/passport/:path*', '/login'],
};
