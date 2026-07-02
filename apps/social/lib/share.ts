/**
 * Compartir (R3): Web Share nativo donde exista (móvil), copiar al portapapeles como respaldo
 * (desktop). Devuelve qué pasó para que el caller confirme con el toast correcto; cancelar el
 * share nativo NO es un fallo (silencio).
 */
export type ShareOutcome = 'shared' | 'copied' | 'dismissed' | 'failed';

export async function shareUrl(url: string, title: string): Promise<ShareOutcome> {
  const absolute = new URL(url, window.location.origin).toString();
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, url: absolute });
      return 'shared';
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'dismissed';
      // Algunos navegadores lanzan NotAllowedError fuera de un gesto: cae al portapapeles.
    }
  }
  try {
    await navigator.clipboard.writeText(absolute);
    return 'copied';
  } catch {
    return 'failed';
  }
}
