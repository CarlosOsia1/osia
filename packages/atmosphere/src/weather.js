/**
 * Clima (S0.7 v2) — capa EFIMERA sobre el preset del bioma. Modifica los params
 * resueltos (niebla, exposicion, sol, color) y dice que particula renderizar.
 *
 * El tuning por clima vive en datos (STRENGTH + FX), no en literales del switch:
 * agregar/ajustar un clima es editar la tabla, no ramas con números mágicos (§1.2/§1.1-O).
 */
import { lerp, clamp01 } from './math';
import { lerpRGB, hexToRGB } from './color';
/** Catálogo (dato) de climas — fuente única; el tipo se deriva de él (DRY). */
export const WEATHER_KINDS = ['despejado', 'lluvia', 'nieve', 'tormenta-arena', 'niebla'];
/** Narrow de un string del cable a WeatherKind (evita casts inseguros en el codec). */
export function isWeatherKind(s) {
    return WEATHER_KINDS.includes(s);
}
export const CLEAR = { kind: 'despejado', intensity: 0 };
/**
 * Fracción del efecto ATMOSFÉRICO (niebla/color, NO las partículas) que aplica cada clima.
 * Lluvia/nieve tiñen poco el aire: la carga visual la llevan las gotas/copos que caen a
 * intensidad plena. Niebla y tormenta SÍ dominan la escena (el aire mismo es el efecto).
 */
const STRENGTH = {
    despejado: 0,
    lluvia: 0.1,
    nieve: 0.4,
    'tormenta-arena': 0.8,
    niebla: 0.6,
};
/**
 * Cómo se ilumina la bruma/polvo según la hora (`night` 0=día .. 1=noche): la NIEBLA
 * (mist) dispersa la luz lunar y debe seguir visible de noche (piso alto); el POLVO de
 * arena no brilla y se apaga de noche (piso bajo). `*Base` = factor de día; `+ *Gain*night` lo sube de noche.
 */
const NIGHT = { fogGlowBase: 0.65, fogGlowGain: 0.35, sandDimBase: 0.45, sandDimGain: 0.55 };
/** Coeficientes de tuning por clima (datos): pisos/multiplicadores de niebla, mezclas de color, etc. */
const FX = {
    lluvia: { fogFloor: 0.012, fogMult: 1.8, greyDesat: 0.5, fogMix: 0.6, exposureMul: 0.82, sunMul: 0.55, skyDesat: 0.5, skyMix: 0.5, bloomMul: 0.8 },
    nieve: { fogFloor: 0.012, fogMult: 1.6, fogLighten: 0.4, fogMix: 0.5, exposureMul: 1.03, sunMul: 0.8 },
    'tormenta-arena': { fogFloor: 0.05, fogMult: 3.0, fogMix: 0.9, exposureMul: 0.92, sunMul: 0.5, skyMix: 0.65, skyHorizonMix: 0.85, ambientMix: 0.8, ambientAdd: 0.6 },
    niebla: { fogFloor: 0.05, fogMult: 2.8, fogMix: 0.78, sunMul: 0.7, exposureMul: 0.98, skyMix: 0.7, skyHorizonMix: 0.82, ambientMix: 0.6, ambientAdd: 0.45 },
};
const GREY = hexToRGB('#8b94a0');
const SAND = hexToRGB('#c2a25f'); // arena AMARILLA/dorada
const WHITE = hexToRGB('#e8ebf0'); // niebla BLANCA (un pelo fría, sin reventar)
function desat(c, k) {
    const l = 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
    return [lerp(c[0], l, k), lerp(c[1], l, k), lerp(c[2], l, k)];
}
function lighten(c, k) {
    return [lerp(c[0], 1, k), lerp(c[1], 1, k), lerp(c[2], 1, k)];
}
/** Escala el brillo de un color (0 negro → 1 igual). Para oscurecer tintes de noche. */
function scale(c, k) {
    return [c[0] * k, c[1] * k, c[2] * k];
}
export function applyWeather(p, w) {
    const i = clamp01(w.intensity) * STRENGTH[w.kind];
    if (i <= 0)
        return p;
    // La niebla/polvo se ILUMINA con la luz disponible (ver NIGHT): la niebla brilla de
    // noche (glow lunar), la arena se apaga. `1` = día.
    const night = 1 - clamp01(p.starsIntensity);
    const dayN = NIGHT.fogGlowBase + NIGHT.fogGlowGain * night; // niebla: visible de noche
    const dayS = NIGHT.sandDimBase + NIGHT.sandDimGain * night; // arena: oscura de noche
    const W = scale(WHITE, dayN);
    const S = scale(SAND, dayS);
    let fogDensity = p.fogDensity;
    let fogColor = p.fogColor;
    let exposure = p.exposure;
    let sunIntensity = p.sunIntensity;
    let skyTop = p.skyTop;
    let skyHorizon = p.skyHorizon;
    let bloom = p.bloom;
    let ambientColor = p.ambientColor;
    let ambientIntensity = p.ambientIntensity;
    switch (w.kind) {
        case 'lluvia': {
            const fx = FX.lluvia;
            fogDensity = lerp(p.fogDensity, Math.max(p.fogDensity, fx.fogFloor) * fx.fogMult, i);
            fogColor = lerpRGB(p.fogColor, desat(GREY, fx.greyDesat), i * fx.fogMix);
            exposure = lerp(p.exposure, p.exposure * fx.exposureMul, i);
            sunIntensity = lerp(p.sunIntensity, p.sunIntensity * fx.sunMul, i);
            skyTop = lerpRGB(p.skyTop, desat(p.skyTop, fx.skyDesat), i * fx.skyMix);
            skyHorizon = lerpRGB(p.skyHorizon, desat(p.skyHorizon, fx.skyDesat), i * fx.skyMix);
            bloom = lerp(p.bloom, p.bloom * fx.bloomMul, i);
            break;
        }
        case 'nieve': {
            const fx = FX.nieve;
            fogDensity = lerp(p.fogDensity, Math.max(p.fogDensity, fx.fogFloor) * fx.fogMult, i);
            fogColor = lerpRGB(p.fogColor, lighten(p.fogColor, fx.fogLighten), i * fx.fogMix);
            exposure = lerp(p.exposure, p.exposure * fx.exposureMul, i);
            sunIntensity = lerp(p.sunIntensity, p.sunIntensity * fx.sunMul, i);
            break;
        }
        case 'tormenta-arena': {
            // Fog ALTO y AMARILLO. El polvo brillante DISPERSA luz: se sube y tinta el
            // ambiente de arena, así lo cercano NO queda como silueta negra contra la bruma.
            const fx = FX['tormenta-arena'];
            fogDensity = lerp(p.fogDensity, Math.max(p.fogDensity, fx.fogFloor) * fx.fogMult, i);
            fogColor = lerpRGB(p.fogColor, S, i * fx.fogMix);
            exposure = lerp(p.exposure, p.exposure * fx.exposureMul, i);
            sunIntensity = lerp(p.sunIntensity, p.sunIntensity * fx.sunMul, i);
            skyTop = lerpRGB(p.skyTop, S, i * fx.skyMix);
            skyHorizon = lerpRGB(p.skyHorizon, S, i * fx.skyHorizonMix);
            ambientColor = lerpRGB(p.ambientColor, S, i * fx.ambientMix);
            ambientIntensity = lerp(p.ambientIntensity, p.ambientIntensity + fx.ambientAdd * dayS, i);
            break;
        }
        case 'niebla': {
            // Fog ALTO y BLANCO. Luz difusa: ambiente hacia blanco para que lo cercano se
            // BAÑE de niebla (no siluetas negras) y de noche se vea bruma blanca, no un degradado.
            const fx = FX.niebla;
            fogDensity = lerp(p.fogDensity, Math.max(p.fogDensity, fx.fogFloor) * fx.fogMult, i);
            fogColor = lerpRGB(p.fogColor, W, i * fx.fogMix);
            sunIntensity = lerp(p.sunIntensity, p.sunIntensity * fx.sunMul, i);
            exposure = lerp(p.exposure, p.exposure * fx.exposureMul, i);
            skyTop = lerpRGB(p.skyTop, W, i * fx.skyMix);
            skyHorizon = lerpRGB(p.skyHorizon, W, i * fx.skyHorizonMix);
            ambientColor = lerpRGB(p.ambientColor, W, i * fx.ambientMix);
            ambientIntensity = lerp(p.ambientIntensity, p.ambientIntensity + fx.ambientAdd * dayN, i);
            break;
        }
    }
    return { ...p, fogDensity, fogColor, exposure, sunIntensity, skyTop, skyHorizon, bloom, ambientColor, ambientIntensity };
}
/** Tipo de partícula a renderizar para el clima actual (null = ninguna). */
export function precipKind(w) {
    if (w.intensity <= 0 || w.kind === 'despejado')
        return null;
    if (w.kind === 'lluvia')
        return 'rain';
    if (w.kind === 'nieve')
        return 'snow';
    if (w.kind === 'tormenta-arena')
        return 'sand';
    if (w.kind === 'niebla')
        return 'fog';
    return null;
}
//# sourceMappingURL=weather.js.map