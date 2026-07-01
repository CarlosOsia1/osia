/**
 * Sesgo del clima por BIOMA × ESTACIÓN (S2-B2) — DATOS. La estación NO introduce climas ajenos al
 * bioma: un desierto nunca tiene nieve, una tundra nunca tiene tormenta de arena. Solo se ponderan
 * los climas que el bioma YA permite (biomes.ts); la estación cambia (a) la FRECUENCIA con que
 * ocurre clima (`eventChance`) y (b) CUÁL de los permitidos es más probable (`weights`).
 *
 * Así sale natural: más lluvia en primavera (bosque), más nieve en invierno (tundra), más tormentas
 * en verano (dunas) — siempre dentro de lo que cada bioma puede tener. Ajustar = editar la tabla.
 */
const DEFAULT_BIAS = { eventChance: 0.7, weights: {} };
/** Tabla bioma → estación → sesgo. Solo aparecen climas que el bioma permite. */
const BIAS = {
    'bosque-celeste': {
        // Permite: lluvia, niebla. Primavera lluviosa; verano seco; otoño con niebla.
        primavera: { eventChance: 0.85, weights: { lluvia: 3, niebla: 1 } },
        verano: { eventChance: 0.45, weights: { lluvia: 1, niebla: 1 } },
        otono: { eventChance: 0.8, weights: { lluvia: 1.5, niebla: 3 } },
        invierno: { eventChance: 0.6, weights: { lluvia: 1, niebla: 2 } },
    },
    'tundra-nevada': {
        // Permite: nieve, niebla. Invierno muy nevado; verano apenas.
        primavera: { eventChance: 0.6, weights: { nieve: 1.5, niebla: 2 } },
        verano: { eventChance: 0.3, weights: { nieve: 1, niebla: 1.5 } },
        otono: { eventChance: 0.7, weights: { nieve: 2, niebla: 1.5 } },
        invierno: { eventChance: 0.9, weights: { nieve: 4, niebla: 1 } },
    },
    'dunas-doradas': {
        // Permite: tormenta-arena (único). La estación solo cambia la frecuencia: verano tormentoso.
        primavera: { eventChance: 0.55, weights: {} },
        verano: { eventChance: 0.85, weights: {} },
        otono: { eventChance: 0.7, weights: {} },
        invierno: { eventChance: 0.4, weights: {} },
    },
};
export function seasonWeatherBias(biome, season) {
    return BIAS[biome]?.[season] ?? DEFAULT_BIAS;
}
//# sourceMappingURL=seasonWeather.js.map