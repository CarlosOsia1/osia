/**
 * Catálogo declarativo de experiencias del Vestíbulo (docs/10 §6.2; backlog S1.1-H2 / S1.7-H2).
 *
 * El Vestíbulo renderiza una "puerta" (`ExperienceThreshold`) por cada entrada **viva** de este
 * catálogo. Agregar una experiencia = agregar un objeto aquí (datos, no código): el componente
 * no cambia. En Fase 1 hay UNA puerta: El Mundo. La amplitud emerge (depth-first).
 *
 * `nombre` es un proper-noun de marca (no se traduce, §2.5/§3.2); el copy visible de la puerta
 * (descripción/tagline) se localiza vía i18n en S1.7, fuera de este catálogo de datos.
 */

/** Id estable de experiencia (clave de routing/estado; docs/10 usa `world`). */
export type ExperienceId = 'world' | 'social' | 'games';

/** Estado de una puerta: viva (deep-link real), próxima (atenuada, FOMO) o archivada. */
export type ExperienceStatus = 'live' | 'coming-soon' | 'archived';

export type Experience = {
  id: ExperienceId;
  /** Nombre de marca es-CO (proper-noun, no se traduce). */
  nombre: string;
  /** Subdominio donde vive la experiencia. */
  dominio: string;
  estado: ExperienceStatus;
  /** Fase en la que entra en vivo. */
  fase: number;
};

/** El catálogo. Aditivo: nuevas puertas se agregan aquí (datos, no código). */
export const EXPERIENCES = [
  { id: 'world', nombre: 'El Mundo', dominio: 'mundo.osia.com', estado: 'live', fase: 1 },
  { id: 'social', nombre: 'La Red Social', dominio: 'social.osia.com', estado: 'live', fase: 3 },
] as const satisfies readonly Experience[];

/** Las experiencias con puerta activa (deep-link real) — lo que el Vestíbulo muestra encendido. */
export const LIVE_EXPERIENCES: readonly Experience[] = EXPERIENCES.filter(
  (e) => e.estado === 'live',
);

/** Busca una experiencia por id; `undefined` si no existe en el catálogo. */
export function getExperience(id: ExperienceId): Experience | undefined {
  return EXPERIENCES.find((e) => e.id === id);
}
