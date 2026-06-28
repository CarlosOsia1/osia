import { createHash } from 'node:crypto';

/**
 * UUID v5 (RFC 4122) determinista de `name` bajo `namespace` (un UUID). Mismo (namespace, name) → mismo
 * UUID, estable entre procesos. Útil para `source_ref` deterministas (dedup por entidad+actor). Node 20
 * no expone v5 nativo (`crypto.randomUUID` es v4) y `uuid` no es dependencia, así que se implementa aquí
 * (no es reinvención prohibida §0.3: es la primitiva estándar). Puro, sin I/O → testeable (§1.3/§10).
 */
export function uuidV5(name: string, namespace: string): string {
  const ns = Buffer.from(namespace.replace(/-/g, ''), 'hex');
  const hash = createHash('sha1').update(ns).update(name, 'utf8').digest();
  const b = Uint8Array.prototype.slice.call(hash, 0, 16);
  b[6] = ((b[6] ?? 0) & 0x0f) | 0x50; // versión 5
  b[8] = ((b[8] ?? 0) & 0x3f) | 0x80; // variante RFC 4122
  const h = Buffer.from(b).toString('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}
