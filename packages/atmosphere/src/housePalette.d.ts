/**
 * Paleta de la casa "house-celestial" (S0.7-H2, docs/06 §8) — el LINTER de presets que
 * protege la identidad de marca. Un motor combinatorio puede producir cualquier color;
 * sin esta compuerta, tarde o temprano sale un cielo verde fosforescente que rompe la marca.
 *
 * Gamut: cielos ónix ↔ índigo ↔ champán-dusk; luz champán; niebla marfil tintada.
 * PROHIBIDO (docs/06:500): verdes neón/ácidos, magentas calientes, y clipping a negro/
 * blanco puro. Reglas en OKLCH (perceptual): chroma alto + banda de tono prohibida = fuera.
 * Los azules/índigos profundos SÍ entran (chroma alto pero tono azul, no verde/magenta).
 */
import type { AtmosphereParams, RGB } from './types';
/**
 * Valida un color contra el gamut house-celestial. Devuelve la razón del rechazo, o `null`
 * si el color es admisible.
 */
export declare function checkHouseCelestial(c: RGB): string | null;
/** Lint de un preset completo: lista de violaciones (vacía = preset dentro del gamut). */
export declare function lintAtmosphereParams(p: AtmosphereParams): string[];
/**
 * Empuja un color DENTRO del gamut house-celestial si lo viola (devuelve el mismo si ya es
 * admisible). Clampa la luminancia lejos del clipping a negro/blanco y baja la chroma de los
 * tonos prohibidos (verde ácido / magenta). Sirve para teñir la UI con el cielo (S2-A1) sin
 * que un color extremo rompa la marca. Complementa a checkHouseCelestial (que solo valida).
 */
export declare function clampToHouseCelestial(c: RGB): RGB;
//# sourceMappingURL=housePalette.d.ts.map