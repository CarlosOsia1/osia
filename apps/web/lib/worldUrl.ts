import { buildDeepLink } from '@osia/identity';

/**
 * URL de El Mundo para el cruce de umbral (S1.7-H3). En dev, NEXT_PUBLIC_WORLD_URL apunta al
 * world-client local; en prod cae al catalogo declarativo (mundo.osia.com) via buildDeepLink. La
 * sesion viaja por cookie de dominio padre (.osia.*); el deep-link solo resuelve el destino, la
 * autenticacion es transparente (el world ticket lo pide world-client en S1.8).
 */
export function worldUrl(): string {
  const override = process.env.NEXT_PUBLIC_WORLD_URL;
  return override && override.length > 0 ? override : buildDeepLink('world');
}
