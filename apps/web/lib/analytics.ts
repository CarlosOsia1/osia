/**
 * Instrumentacion de experiencia (S1.7-H3). Punto unico para eventos del Vestibulo. En F1 emite un
 * CustomEvent `osia:track` en window (extension point); la analitica real (PostHog/propia) se
 * suscribe sin tocar los callers. SSR-safe.
 */
export function track(event: string, props?: Record<string, string | number>): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('osia:track', { detail: { event, props } }));
}
