export const REPUTATION_LEDGER = Symbol('REPUTATION_LEDGER');

/**
 * Puerto de salida del ledger de reputación (event-sourced, append-only). La aplicación acredita por
 * razones acotadas; el adapter persiste el asiento y el caché de `profiles` lo mantiene un trigger SQL.
 * La idempotencia/anti-grind (un seguidor acredita a un seguido una sola vez) la garantiza el índice
 * único parcial de `economy.reputation_ledger`, no la aplicación.
 */
export interface ReputationLedgerPort {
  /**
   * Acredita reputación al SEGUIDO (`followeeAccountId`) por un seguidor nuevo. Idempotente por el par
   * (seguido, seguidor): re-acreditar el mismo par no suma. `credited=false` si el asiento ya existía.
   */
  creditNewFollower(
    followeeAccountId: string,
    followerAccountId: string,
  ): Promise<{ credited: boolean }>;
}
