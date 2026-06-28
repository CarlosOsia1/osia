/**
 * Puerto out de salud del contexto `social`. El dominio/aplicación dependen de esta abstracción,
 * no del driver de Postgres (CLAUDE.md §1.4 inversión de dependencias). El adapter concreto
 * (infrastructure) verifica que el schema `social` esté aplicado.
 */
export const SOCIAL_HEALTH_PORT = Symbol('SOCIAL_HEALTH_PORT');

export interface SocialHealthPort {
  /** ¿El schema `social` está accesible (sus tablas creadas)? `false` ante cualquier fallo de DB. */
  isSchemaReady(): Promise<boolean>;
}
