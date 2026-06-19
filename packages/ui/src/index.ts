/**
 * @osia/ui — Design System de OSIA (tokens + componentes con Italiana / Jost).
 *
 * Stub de Fase 0 · OSIA-S0.1. Los tokens completos y los componentes (incl. el
 * Vestíbulo / Bóveda Celeste) llegan en Fase 1. Ver docs/02-marca-design-system.md.
 */

/** Paleta de marca OSIA (celestial / astral). */
export const OSIA_COLORS = {
  champan: '#CBB89A',
  onix: '#0D0D0D',
  marfil: '#F5F1E8',
  taupe: '#8C7B66',
} as const;

export type OsiaColorToken = keyof typeof OSIA_COLORS;
