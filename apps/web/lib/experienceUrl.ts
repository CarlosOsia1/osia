import { buildDeepLink } from '@osia/identity';
import type { ExperienceId } from '@osia/shared';

/**
 * URL de destino del cruce de umbral para CUALQUIER experiencia (S3.5-H2). En dev, un override por env
 * (`NEXT_PUBLIC_<EXP>_URL`) apunta al app local; en prod cae al catálogo declarativo (`*.osia.com`) vía
 * `buildDeepLink`. La sesión viaja por la cookie de dominio padre (.osia.*); el deep-link solo resuelve
 * el destino, el handoff es transparente.
 */
const DEV_OVERRIDES: Partial<Record<ExperienceId, string | undefined>> = {
  world: process.env.NEXT_PUBLIC_WORLD_URL,
  social: process.env.NEXT_PUBLIC_SOCIAL_URL,
};

export function experienceUrl(id: ExperienceId): string {
  const override = DEV_OVERRIDES[id];
  return override && override.length > 0 ? override : buildDeepLink(id);
}
