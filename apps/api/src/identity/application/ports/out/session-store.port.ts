import type { Tx } from '../../../../common/tx';

export const SESSION_STORE = Symbol('SESSION_STORE');

/** Una sesión server-side (fila de `identity.sessions`), tal como la lee el servicio de sesión. */
export type ServerSession = {
  id: string;
  accountId: string;
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: Date;
  expiresAt: Date;
};

/** Datos para crear una sesión server-side (Ola 1F). */
export type NewServerSession = {
  id: string;
  accountId: string;
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: Date;
  expiresAt: Date;
};

/**
 * Almacén de sesiones SSO server-side (Ola 1F). Guarda la sesión de Supabase (access+refresh) tras un ID
 * opaco; el refresh se rota SERVER-SIDE con `findByIdForUpdate` (SELECT … FOR UPDATE) para single-flight.
 */
export interface SessionStore {
  create(session: NewServerSession): Promise<void>;
  /** Lectura rápida SIN bloqueo (fast path: el access cacheado sigue vigente). */
  findById(id: string): Promise<ServerSession | null>;
  /** Lectura CON `FOR UPDATE` dentro de la tx (serializa el refresh entre requests/instancias). */
  findByIdForUpdate(tx: Tx, id: string): Promise<ServerSession | null>;
  /** Actualiza los tokens de Supabase tras un refresh, en la misma tx del `FOR UPDATE`. */
  updateTokens(
    tx: Tx,
    id: string,
    accessToken: string,
    refreshToken: string,
    accessExpiresAt: Date,
  ): Promise<void>;
  /** Borra la sesión; devuelve su refresh de Supabase (para revocarlo en el proveedor), o null. */
  deleteById(id: string): Promise<string | null>;
  /** Revoca TODAS las sesiones de una cuenta (reset de contraseña / borrado). */
  deleteByAccount(accountId: string): Promise<void>;
}
