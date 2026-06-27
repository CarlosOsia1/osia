export const DELETION_TOKEN_REPOSITORY = Symbol('DELETION_TOKEN_REPOSITORY');

/**
 * Tokens de borrado de cuenta por link de email (un solo uso, 24 h). Guardamos solo el HASH del
 * token (nunca el valor limpio). Ver identity.account_deletion_tokens.
 */
export interface DeletionTokenRepository {
  /** Crea un token (su hash) con vencimiento para una cuenta. */
  create(accountId: string, tokenHash: string, expiresAt: Date): Promise<void>;
  /**
   * Consume un token VÁLIDO (existe, no usado, no vencido): lo marca usado ATÓMICAMENTE y devuelve
   * el accountId. `null` si el token no existe, ya se usó o venció (un solo uso garantizado).
   */
  consume(tokenHash: string): Promise<string | null>;
}
