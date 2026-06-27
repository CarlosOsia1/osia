/**
 * Port de salida hacia el proveedor de auth (Supabase Auth / GoTrue). El dominio depende de esta
 * abstracción, NO del SDK (inversión de dependencias §1.1-D). El adapter concreto vive en
 * infrastructure.
 */
export const SUPABASE_AUTH_PORT = Symbol('SUPABASE_AUTH_PORT');

export type CreateUserInput = {
  email: string;
  password?: string;
  metadata?: Record<string, unknown>;
};

export interface SupabaseAuthPort {
  /** Verifica conectividad + credenciales con el proveedor (readiness probe). */
  ping(): Promise<{ ok: boolean; users: number }>;
  /** Crea un usuario de auth (sin confirmar email). El trigger crea cuenta+perfil+avatar. */
  createUser(input: CreateUserInput): Promise<{ id: string }>;
  /** Borra un usuario de auth (compensación de saga si el cierre de signup falla). */
  deleteUser(id: string): Promise<void>;
}
