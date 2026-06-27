import type { AccountDto, Passport, ProfileDto } from '@osia/shared';

export const ACCOUNT_REPOSITORY = Symbol('ACCOUNT_REPOSITORY');

export type SignupCompletion = {
  accountId: string;
  handle: string;
  displayName: string;
  code: string;
  inviterAccountId: string | null;
};

export interface AccountRepository {
  isHandleTaken(handle: string): Promise<boolean>;
  /**
   * Transacción atómica de cierre de signup: fija handle/displayName en el perfil, acepta la
   * invitación (solo si sigue `pending`) y setea `invited_by`. Lanza `HandleTakenError` o
   * `InvitationConflictError`. Devuelve el account + profile resultantes.
   */
  completeSignup(input: SignupCompletion): Promise<{ account: AccountDto; profile: ProfileDto }>;
  /** Ensambla el pasaporte (cuenta + perfil) para el SSO; `null` si no existe. */
  getPassport(accountId: string): Promise<Passport | null>;
  /** Email de la cuenta viva (para confirmar el borrado por contraseña); `null` si no existe (S2-C2). */
  getEmail(accountId: string): Promise<string | null>;
  /**
   * Borra la cuenta DE VERDAD (hard delete) en una transacción (S2-C2). La cascada de FKs elimina
   * perfil, avatares, verificaciones de email y sesiones de presencia; las invitaciones quedan
   * anonimizadas (ON DELETE SET NULL). Idempotente: `false` si no había nada que borrar.
   */
  deleteAccount(accountId: string): Promise<boolean>;
}
