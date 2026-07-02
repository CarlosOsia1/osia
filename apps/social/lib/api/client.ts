import type { z } from 'zod';
import { identity } from '../identity';

/**
 * Núcleo de la capa de datos (R1 de la reconstrucción): toda llamada al API pasa por aquí y
 * TODA respuesta se valida contra su esquema Zod de `@osia/shared` antes de tocar la UI. Un
 * contrato que diverge explota como `ApiContractError` (visible en ErrorState/toast y en la
 * consola) en vez de mentir en pantalla — así se habrían cazado el bug del perfil sin
 * `viewerState` (Ola 0) y el de `GET /v1/presence` leído como array (R1).
 *
 * Reusa el `authedFetch` del pasaporte SSO (Bearer + refresh silencioso; lanza `OsiaApiError`
 * ante !ok). La subida de binarios NO pasa por aquí: va directa a Storage (ver `media.ts`).
 */

/** El API respondió 2xx pero la forma no cumple el contrato compartido. Bug, no estado de red. */
export class ApiContractError extends Error {
  constructor(
    readonly path: string,
    readonly issues: z.ZodError,
  ) {
    super(`respuesta fuera de contrato en ${path}: ${issues.message}`);
    this.name = 'ApiContractError';
  }
}

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

type CallInit = {
  method: Method;
  /** Cuerpo JSON (se serializa aquí). */
  body?: unknown;
};

/** Llamada autenticada cuya respuesta se parsea contra `schema` (única puerta de lectura). */
export async function apiCall<S extends z.ZodTypeAny>(
  path: string,
  schema: S,
  init: CallInit = { method: 'GET' },
): Promise<z.output<S>> {
  const raw = await identity.authedFetch<unknown>(path, {
    method: init.method,
    ...(init.body !== undefined ? { body: JSON.stringify(init.body) } : {}),
  });
  const parsed = schema.safeParse(raw);
  if (!parsed.success) throw new ApiContractError(path, parsed.error);
  return parsed.data as z.output<S>;
}

/** Escritura cuya respuesta es vacía (204) o se ignora a propósito (PUT/DELETE idempotentes). */
export async function apiVoid(path: string, init: CallInit): Promise<void> {
  await identity.authedFetch<unknown>(path, {
    method: init.method,
    ...(init.body !== undefined ? { body: JSON.stringify(init.body) } : {}),
  });
}

/** Query string de paginación keyset (`?cursor=`), vacío sin cursor. */
export function pageQs(cursor?: string): string {
  return cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
}
