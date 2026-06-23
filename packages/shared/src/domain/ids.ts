/**
 * Branded IDs — evitan la "primitive obsession" (CLAUDE.md §1.2 / §5): un `EntityId`
 * NO se puede mezclar con cualquier `number`. En el cable siguen siendo enteros; el
 * brand vive solo en el sistema de tipos (cero costo en runtime).
 *
 * `EntityId` (F0): identidad de una entidad/jugador dentro de una instancia del mundo.
 * `AccountId` (se densifica en Fase 1): identidad de cuenta — en F0 es efímera, derivada
 * del handle; en Fase 1 pasa a ser el `accounts.id` persistente del pasaporte.
 * `ProfileId` (Fase 1): identidad del pasaporte (`profiles.id`); distinta de `AccountId`
 * (1:1 hoy, pero conceptualmente separadas — evita confundir cuenta con perfil público).
 */

declare const brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [brand]: B };

export type EntityId = Brand<number, 'EntityId'>;
export type AccountId = Brand<string, 'AccountId'>;
export type ProfileId = Brand<string, 'ProfileId'>;

/** Construye un `EntityId` desde un entero del cable (única puerta de creación). */
export const asEntityId = (n: number): EntityId => n as EntityId;
/** Construye un `AccountId` (Fase 1: el `accounts.id`; F0: derivado del handle). */
export const asAccountId = (s: string): AccountId => s as AccountId;
/** Construye un `ProfileId` (Fase 1: el `profiles.id`). */
export const asProfileId = (s: string): ProfileId => s as ProfileId;
