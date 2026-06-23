/**
 * Branded IDs — evitan la "primitive obsession" (CLAUDE.md §1.2 / §5): un `EntityId`
 * NO se puede mezclar con cualquier `number`. En el cable siguen siendo enteros; el
 * brand vive solo en el sistema de tipos (cero costo en runtime).
 *
 * `EntityId` (F0): identidad de una entidad/jugador dentro de una instancia del mundo.
 * `AccountId` (se densifica en Fase 1): identidad de cuenta — en F0 es efímera, derivada
 * del handle; en Fase 1 pasa a ser el `accounts.id` persistente del pasaporte.
 */

declare const brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [brand]: B };

export type EntityId = Brand<number, 'EntityId'>;
export type AccountId = Brand<string, 'AccountId'>;

/** Construye un `EntityId` desde un entero del cable (única puerta de creación). */
export const asEntityId = (n: number): EntityId => n as EntityId;
/** Construye un `AccountId` (Fase 1: el `accounts.id`; F0: derivado del handle). */
export const asAccountId = (s: string): AccountId => s as AccountId;
