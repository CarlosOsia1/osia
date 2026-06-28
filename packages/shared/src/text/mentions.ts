/**
 * Detección simple de menciones `@handle` en texto (comentarios, S3.3-H3/S3.4). Pura y determinista
 * (sin I/O): el servidor resuelve los handles a `accountId` para notificar. El handle sigue el formato
 * del pasaporte (`^[a-z0-9_]{3,20}$`); el match es case-insensitive y se normaliza a minúsculas.
 */
const MENTION_RE = /@([a-zA-Z0-9_]{3,20})/g;

/** Devuelve los handles únicos (en minúscula) mencionados en `text`, en orden de aparición. */
export function parseMentions(text: string): string[] {
  const seen = new Set<string>();
  for (const match of text.matchAll(MENTION_RE)) {
    const handle = match[1];
    if (handle) seen.add(handle.toLowerCase());
  }
  return [...seen];
}
