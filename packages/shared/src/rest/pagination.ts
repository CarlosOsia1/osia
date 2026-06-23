/**
 * Paginación por cursor (keyset), no offset (docs/10 §1.5).
 *
 * El offset (`LIMIT n OFFSET m`) se degrada y salta/duplica filas cuando llegan inserciones
 * en vivo (feeds, leaderboards). El keyset es O(1) por página y estable. El cursor es
 * **opaco**: lo construye el servidor y el cliente solo lo reenvía, de modo que el criterio
 * de orden puede cambiar internamente sin romper clientes.
 */

/** Límite por defecto de página (docs/10 §1.5). */
export const DEFAULT_PAGE_LIMIT = 20;
/** Tope duro de página: el servidor nunca devuelve más, aunque el cliente pida más. */
export const MAX_PAGE_LIMIT = 100;

/** Metadata de página devuelta junto a `data`. */
export type PageInfo = {
  /** Cursor opaco para la siguiente página; `null` si no hay más. */
  nextCursor: string | null;
  hasMore: boolean;
  /** Límite efectivo aplicado (ya clampeado). */
  limit: number;
};

/** Envoltura estándar de lista paginada: `{ data, page }`. */
export type Page<T> = {
  data: T[];
  page: PageInfo;
};

/**
 * Contenido decodificado de un cursor keyset: la clave de orden de la última fila +
 * el id (UUID v7) como desempate estable. El cliente nunca lo construye.
 */
export type Cursor = {
  sortKey: string | number;
  id: string;
};

/** Clampa un `limit` pedido al rango válido `[1, MAX_PAGE_LIMIT]`, con default si falta. */
export function clampLimit(requested?: number): number {
  if (requested === undefined || !Number.isFinite(requested)) return DEFAULT_PAGE_LIMIT;
  return Math.max(1, Math.min(MAX_PAGE_LIMIT, Math.floor(requested)));
}

/** Codifica un cursor a base64url opaco (UTF-8 safe, portable navegador↔Node). */
export function encodeCursor(cursor: Cursor): string {
  return toBase64Url(JSON.stringify(cursor));
}

/** Decodifica un cursor opaco; devuelve `null` si está malformado (nunca lanza — input de cliente). */
export function decodeCursor(opaque: string): Cursor | null {
  try {
    const parsed: unknown = JSON.parse(fromBase64Url(opaque));
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'sortKey' in parsed &&
      'id' in parsed &&
      typeof (parsed as Cursor).id === 'string' &&
      (typeof (parsed as Cursor).sortKey === 'string' ||
        typeof (parsed as Cursor).sortKey === 'number')
    ) {
      return parsed as Cursor;
    }
    return null;
  } catch {
    return null;
  }
}

// --- base64url portable y unicode-safe (btoa/atob operan en latin1; envolvemos UTF-8) ---

function toBase64Url(text: string): string {
  const binary = encodeURIComponent(text).replace(/%([0-9A-F]{2})/g, (_, hex: string) =>
    String.fromCharCode(parseInt(hex, 16)),
  );
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(b64url: string): string {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(b64);
  const percentEncoded = Array.from(
    binary,
    (ch) => '%' + ch.charCodeAt(0).toString(16).padStart(2, '0'),
  ).join('');
  return decodeURIComponent(percentEncoded);
}
