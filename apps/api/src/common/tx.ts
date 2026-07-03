import type { Pool, PoolClient } from 'pg';

/**
 * Manejador de transacción (unit-of-work). Un `Tx` es cualquier cosa que sepa ejecutar SQL dentro (o
 * fuera) de una transacción: el `Pool` (autocommit) o un `PoolClient` con un `BEGIN` abierto. Los
 * métodos de escritura de los repos y el outbox aceptan un `Tx` para poder participar de la MISMA
 * transacción que abre el caso de uso — así el write de dominio y el `INSERT` en `social.outbox` son
 * atómicos. Es un tipo de persistencia que la aplicación coordina (patrón UoW estándar); el leve
 * acoplamiento a `pg` aquí es deliberado y acotado a las firmas de puerto.
 */
export type Tx = Pool | PoolClient;

export const TX_RUNNER = Symbol('TX_RUNNER');

/** Corre `fn` dentro de una transacción: BEGIN, ejecuta, COMMIT; ante cualquier error ROLLBACK y relanza. */
export interface TxRunner {
  run<T>(fn: (tx: Tx) => Promise<T>): Promise<T>;
}
