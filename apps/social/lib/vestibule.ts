/**
 * El Vestíbulo (apps/web) es la puerta de entrada/login del ecosistema. La Red Social no tiene
 * login propio: un residente sin sesión se manda al login del Vestíbulo con un `returnTo` para
 * volver acá tras autenticarse (S3.1-H1). El SSO viaja por la cookie de dominio padre (.osia.*),
 * así que al volver, la sesión ya está. Usable en server, edge (middleware) y cliente.
 */
export function vestibuleBaseUrl(): string {
  return process.env.NEXT_PUBLIC_VESTIBULE_URL ?? 'http://localhost:3001';
}

export function socialBaseUrl(): string {
  return process.env.NEXT_PUBLIC_SOCIAL_URL ?? 'http://localhost:3002';
}

/** URL de El Mundo (world-client) para "Viajar al mundo" desde el menú de perfil. */
export function worldBaseUrl(): string {
  return process.env.NEXT_PUBLIC_WORLD_URL ?? 'http://localhost:3000';
}

/** URL del login del Vestíbulo con `returnTo` (default: la propia app social). */
export function vestibuleLoginUrl(returnTo?: string): string {
  const url = new URL('/login', vestibuleBaseUrl());
  url.searchParams.set('returnTo', returnTo ?? socialBaseUrl());
  return url.toString();
}
