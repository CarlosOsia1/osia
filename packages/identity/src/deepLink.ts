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
