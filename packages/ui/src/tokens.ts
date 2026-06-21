/**
 * Tokens en TypeScript — para contextos donde NO hay CSS vars (Three.js / canvas 2D).
 * La fuente de verdad de la UI web son las CSS vars de `styles.css`; esto las refleja.
 */

/** Paleta de marca OSIA (celestial / astral). Usada por el render 3D (THREE.Color). */
export const OSIA_COLORS = {
  champan: '#CBB89A',
  onix: '#0D0D0D',
  marfil: '#F5F1E8',
  taupe: '#8C7B66',
} as const;

export type OsiaColorToken = keyof typeof OSIA_COLORS;
