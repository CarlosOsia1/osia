/**
 * Saneo de texto de chat — COMPARTIDO cliente↔servidor (mismo límite en ambos lados:
 * el cliente recorta antes de enviar y el server lo vuelve a aplicar como autoridad).
 *
 * El vector real NO es XSS (React escapa el texto plano): son caracteres de control,
 * zero-width y RTL-override que rompen la burbuja o suplantan handles. Por eso jamás
 * se usa dangerouslySetInnerHTML/DOMPurify; se normaliza y se quitan esos rangos.
 *
 * Las clases se construyen con new RegExp desde un string ASCII (\\uXXXX) para no
 * meter caracteres de control/invisibles literales en el fuente.
 */

const MAX_CHARS = 240;
const MAX_BYTES = 480; // codec str() = u16-len + UTF-8; emojis/CJK ocupan 2-4 bytes

const STRIP = new RegExp(
  '[' +
    '\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F\\u007F-\\u009F' + // C0/C1/DEL (deja \t\n\r)
    '\\u200B-\\u200D\\u2060\\uFEFF' + // zero-width
    '\\u202A-\\u202E\\u2066-\\u2069' + // bidi override/isolate
    ']',
  'g',
);

const enc = new TextEncoder();

/** Normaliza y acota un mensaje de chat. Devuelve '' si no queda nada imprimible. */
export function normalizeChat(raw: string): string {
  let s = String(raw ?? '')
    .normalize('NFC')
    .replace(STRIP, '')
    .replace(/\s+/g, ' ')
    .trim();
  if ([...s].length > MAX_CHARS) s = [...s].slice(0, MAX_CHARS).join(''); // por codepoints (sin surrogates huérfanos)
  // Guard por bytes (recorta respetando codepoints completos).
  while (s.length > 0 && enc.encode(s).length > MAX_BYTES) s = s.slice(0, -1);
  return s;
}

const MAX_HANDLE_CHARS = 24;

/** Normaliza un handle: mismo saneo que el chat, cap 24 codepoints, fallback 'anónimo'. */
export function normalizeHandle(raw: string): string {
  const s = String(raw ?? '')
    .normalize('NFC')
    .replace(STRIP, '')
    .replace(/\s+/g, ' ')
    .trim();
  return [...s].slice(0, MAX_HANDLE_CHARS).join('') || 'anónimo';
}
