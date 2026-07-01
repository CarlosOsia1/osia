/**
 * Clima (S0.7 v2) — capa EFIMERA sobre el preset del bioma. Modifica los params
 * resueltos (niebla, exposicion, sol, color) y dice que particula renderizar.
 *
 * El tuning por clima vive en datos (STRENGTH + FX), no en literales del switch:
 * agregar/ajustar un clima es editar la tabla, no ramas con números mágicos (§1.2/§1.1-O).
 */
import type { AtmosphereParams } from './types';
/** Catálogo (dato) de climas — fuente única; el tipo se deriva de él (DRY). */
export declare const WEATHER_KINDS: readonly ["despejado", "lluvia", "nieve", "tormenta-arena", "niebla"];
export type WeatherKind = (typeof WEATHER_KINDS)[number];
export type WeatherState = {
    kind: WeatherKind;
    intensity: number;
};
/** Narrow de un string del cable a WeatherKind (evita casts inseguros en el codec). */
export declare function isWeatherKind(s: string): s is WeatherKind;
export declare const CLEAR: WeatherState;
export declare function applyWeather(p: AtmosphereParams, w: WeatherState): AtmosphereParams;
/** Tipo de partícula a renderizar para el clima actual (null = ninguna). */
export declare function precipKind(w: WeatherState): 'rain' | 'snow' | 'sand' | 'fog' | null;
//# sourceMappingURL=weather.d.ts.map