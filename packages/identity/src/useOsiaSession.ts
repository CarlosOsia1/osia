import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { Passport, SessionDto } from '@osia/shared';
import { OsiaApiError, type OsiaIdentityClient } from './OsiaIdentityClient';

export const OSIA_SESSION_KEY = ['osia', 'session'] as const;

/**
 * Hook de sesión SSO (S1.3-H4): cachea el pasaporte y refresca silenciosamente vía la cookie.
 * No reintenta ante 401 (sin sesión → al Vestíbulo a re-loguear). Requiere un QueryClientProvider.
 */
export function useOsiaSession(client: OsiaIdentityClient): UseQueryResult<SessionDto, OsiaApiError> {
  return useQuery<SessionDto, OsiaApiError>({
    queryKey: OSIA_SESSION_KEY,
    queryFn: () => client.getSession(),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

/** Conveniencia: el pasaporte vigente o `null` mientras carga / sin sesión. */
export function usePassport(client: OsiaIdentityClient): Passport | null {
  return useOsiaSession(client).data?.passport ?? null;
}
