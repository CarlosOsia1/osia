/**
 * Estaciones como DATOS (S2-B1) — un ritmo lento por encima del día/noche. La estación NO viaja
 * por el cable: cliente y servidor la derivan del MISMO reloj (timeOfYear), sin transmitir nada.
 *
 * Cada estación tiñe varias SUPERFICIES (cielo, suelo, vegetación…) hacia su color de máxima
 * expresión. Ese máximo ocurre en el PUNTO MEDIO de la estación; entre puntos medios el tinte
 * transiciona de forma CONTINUA (smoothstep) → el ambiente SIEMPRE está cambiando, natural.
 * Orden: primavera → verano → otoño → invierno.
 *
 * EXTENSIBLE a futuro: agregar una superficie nueva (p. ej. 'water', 'rock') = añadirla a
 * SeasonSurface + SEASON_STRENGTH + las tints de cada Season; el motor y los consumidores (la
 * escena) la recogen solos, sin tocar lógica. Agregar/ajustar una estación = editar la tabla.
 * El tinte del CIELO se mantiene dentro del gamut house-celestial (lo valida el linter); el de
 * la escena (suelo/vegetación) tiene más libertad (objetos del mundo, no marca celeste).
 */
import type { AtmosphereParams, RGB } from './types';
export type SeasonId = 'primavera' | 'verano' | 'otono' | 'invierno';
/** Superficies que la estación tiñe. Agregar una = un dato más (ver cabecera). */
export type SeasonSurface = 'sky' | 'ground' | 'foliage';
export declare const SEASON_SURFACES: readonly SeasonSurface[];
export type SeasonTints = Record<SeasonSurface, RGB>;
export type Season = {
    id: SeasonId;
    name: string;
    /** Color objetivo por superficie en la MÁXIMA expresión (punto medio de la estación). */
    tints: SeasonTints;
};
/** Fuerza del tinte por superficie. El cielo es SUTIL (marca); suelo/vegetación cambian MÁS. */
export declare const SEASON_STRENGTH: Record<SeasonSurface, number>;
export type SeasonKeyframe = {
    t: number;
    season: Season;
};
export declare const SEASONS: Record<SeasonId, Season>;
/** Cronograma anual: máxima expresión de cada estación en su PUNTO MEDIO (0.125, 0.375, 0.625, 0.875). */
export declare const SEASON_CYCLE: SeasonKeyframe[];
/** Tintes estacionales (por superficie) para un instante del año, ya interpolados. */
export declare function resolveSeasonTints(timeOfYear: number): SeasonTints;
/** Estación dominante (el cuarto del año donde estamos). Para HUD/diagnóstico. */
export declare function seasonAt(timeOfYear: number): Season;
/** `t` del PUNTO MEDIO (máxima expresión) de una estación — el panel de test salta ahí. */
export declare function seasonPeak(id: SeasonId): number;
/**
 * Aplica el tinte estacional del CIELO a los params de atmósfera (sutil, dentro del gamut). El
 * suelo/vegetación los tiñe la ESCENA con resolveSeasonTints + SEASON_STRENGTH. Pura.
 */
export declare function applySeason(p: AtmosphereParams, skyTint: RGB): AtmosphereParams;
//# sourceMappingURL=seasons.d.ts.map