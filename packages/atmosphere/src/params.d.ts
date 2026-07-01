/**
 * Builder único de AtmosphereParams desde colores hex + escalares. Fuente compartida
 * por presets.ts y biomes.ts (antes duplicado byte-por-byte como p()/mk(), §1.2 DRY).
 * Agregar un campo a AtmosphereParams se hace en UN solo lugar.
 */
import type { AtmosphereParams } from './types';
/** Dirección placeholder; resolveAtmosphere compone las direcciones reales por hora (sunDirFor). */
export declare const UP: readonly [0, 1, 0];
export declare function makeParams(o: {
    skyTop: string;
    skyHorizon: string;
    fog: string;
    fogDensity: number;
    sunColor: string;
    sunIntensity: number;
    moonColor: string;
    moonIntensity: number;
    ambientColor: string;
    ambientIntensity: number;
    exposure: number;
    bloom: number;
    stars: number;
}): AtmosphereParams;
//# sourceMappingURL=params.d.ts.map