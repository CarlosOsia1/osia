/**
 * Codec del protocolo (S0.4-H1). Una sola puerta de (de)serialización para que el
 * cambio a binario (S0.8) no toque los call sites.
 *
 * Hoy: JSON sobre frames de texto. Mañana: bit-packing/cuantización para los
 * mensajes calientes (INPUT/DELTA) — misma firma encode()/decode().
 */

import type { NetMessage, C2SMessage, S2CMessage } from './messages';

/** Serializa un mensaje a wire format (string por ahora). */
export function encode(msg: NetMessage): string {
  return JSON.stringify(msg);
}

/** Deserializa; devuelve null si no es un mensaje válido (op numérico). */
export function decode<T extends NetMessage = NetMessage>(data: string): T | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(data);
  } catch {
    return null;
  }
  if (
    typeof parsed === 'object' &&
    parsed !== null &&
    'op' in parsed &&
    typeof (parsed as { op: unknown }).op === 'number'
  ) {
    return parsed as T;
  }
  return null;
}

export type { NetMessage, C2SMessage, S2CMessage };
