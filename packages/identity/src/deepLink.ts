import { getExperience, type ExperienceId } from '@osia/shared';

/**
 * Construye un deep-link autenticado a una experiencia desde su entrada del catálogo (docs/10 §6.2).
 * El handoff de sesión viaja por la cookie de dominio padre (.osia.*), no por la URL — acá solo se
 * resuelve el destino. localhost → http; el resto → https.
 */
export function buildDeepLink(experienceId: ExperienceId, params?: Record<string, string>): string {
  const exp = getExperience(experienceId);
  if (!exp) throw new Error(`Experiencia desconocida: ${experienceId}`);
  const protocol = exp.dominio.includes('localhost') ? 'http' : 'https';
  const query = params ? `?${new URLSearchParams(params).toString()}` : '';
  return `${protocol}://${exp.dominio}${query}`;
}

/**
 * Resuelve el destino post-login a partir del candidato de `?returnTo=` / `?next=`. Devuelve:
 *  - una RUTA INTERNA (empieza con `/` pero NO con `//` ni `/\`: esas son protocol-relative → open
 *    redirect a otro sitio, el vector clásico de phishing tras teclear credenciales);
 *  - una URL ABSOLUTA solo si su `origin` está en la allowlist (los dominios de las experiencias del
 *    ecosistema — mismo criterio que el `redirect_uri` de un IdP OAuth);
 *  - si nada valida, el `fallback`.
 * Contrato único cross-app (web lo consume en login/verify; social solo construye la URL).
 */
export function resolvePostLoginUrl(
  candidate: string | null | undefined,
  opts: { allowedOrigins: readonly string[]; fallback: string },
): string {
  if (!candidate) return opts.fallback;
  if (candidate.startsWith('/') && !candidate.startsWith('//') && !candidate.startsWith('/\\')) {
    return candidate; // ruta interna segura
  }
  try {
    const url = new URL(candidate);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return opts.fallback;
    const ok = opts.allowedOrigins.some((o) => {
      try {
        return new URL(o).origin === url.origin;
      } catch {
        return false;
      }
    });
    if (ok) return url.toString();
  } catch {
    /* candidato no es una URL válida */
  }
  return opts.fallback;
}
