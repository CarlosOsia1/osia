/**
 * Sesgo del clima por BIOMA × ESTACIÓN (S2-B2) — DATOS. La estación NO introduce climas ajenos al
 * bioma: un desierto nunca tiene nieve, una tundra nunca tiene tormenta de arena. Solo se ponderan
 * los climas que el bioma YA permite (biomes.ts); la estación cambia (a) la FRECUENCIA con que
 * ocurre clima (`eventChance`) y (b) CUÁL de los permitidos es más probable (`weights`).
 *
 * Así sale natural: más lluvia en primavera (bosque), más nieve en invierno (tundra), más tormentas
 * en verano (dunas) — siempre dentro de lo que cada bioma puede tener. Ajustar = editar la tabla.
 */
import type { SeasonId } from './seasons';
import type { WeatherKind } from './weather';
export type SeasonWeatherBias = {
    /** Probabilidad (0..1) de que, al terminar un despejado y con presupuesto del día, OCURRA clima. */
    eventChance: number;
    /** Peso relativo de cada clima del bioma en esta estación (los no listados pesan 1). */
    weights: Partial<Record<WeatherKind, number>>;
};
export declare function seasonWeatherBias(biome: string, season: SeasonId): SeasonWeatherBias;
//# sourceMappingURL=seasonWeather.d.ts.map