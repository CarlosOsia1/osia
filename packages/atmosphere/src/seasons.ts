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

import { lerpRGB, hexToRGB } from './color';
import { smoothstep } from './math';
import type { AtmosphereParams, RGB } from './types';

export type SeasonId = 'primavera' | 'verano' | 'otono' | 'invierno';

/** Superficies que la estación tiñe. Agregar una = un dato más (ver cabecera). */
export type SeasonSurface = 'sky' | 'ground' | 'foliage';
export const SEASON_SURFACES: readonly SeasonSurface[] = ['sky', 'ground', 'foliage'];

export type SeasonTints = Record<SeasonSurface, RGB>;

export type Season = {
  id: SeasonId;
  name: string;
  /** Color objetivo por superficie en la MÁXIMA expresión (punto medio de la estación). */
  tints: SeasonTints;
};

/** Fuerza del tinte por superficie. El cielo es SUTIL (marca); suelo/vegetación cambian MÁS. */
export const SEASON_STRENGTH: Record<SeasonSurface, number> = {
  sky: 0.07,
  ground: 0.42,
  foliage: 1, // la copa TOMA el color de la estación; la variación la pone cada árbol (instanceColor)
};

export type SeasonKeyframe = { t: number; season: Season };

export const SEASONS: Record<SeasonId, Season> = {
  primavera: {
    id: 'primavera',
    name: 'Primavera',
    tints: { sky: hexToRGB('#81b7e4'), ground: hexToRGB('#2a432f'), foliage: hexToRGB('#729446') },
  },
  verano: {
    id: 'verano',
    name: 'Verano',
    tints: { sky: hexToRGB('#e6dcc2'), ground: hexToRGB('#37432a'), foliage: hexToRGB('#356b2c') },
  },
  otono: {
    id: 'otono',
    name: 'Otoño',
    tints: { sky: hexToRGB('#d8b48c'), ground: hexToRGB('#3f3320'), foliage: hexToRGB('#b0682a') },
  },
  invierno: {
    id: 'invierno',
    name: 'Invierno',
    tints: { sky: hexToRGB('#b6c4d8'), ground: hexToRGB('#2b343c'), foliage: hexToRGB('#33493a') },
  },
};

/** Cronograma anual: máxima expresión de cada estación en su PUNTO MEDIO (0.125, 0.375, 0.625, 0.875). */
export const SEASON_CYCLE: SeasonKeyframe[] = [
  { t: 0.125, season: SEASONS.primavera },
  { t: 0.375, season: SEASONS.verano },
  { t: 0.625, season: SEASONS.otono },
  { t: 0.875, season: SEASONS.invierno },
];

const wrap01 = (t: number): number => ((t % 1) + 1) % 1;

/** Las dos estaciones que envuelven `toy` y el factor k (con smoothstep), con wrap de fin de año. */
function bracket(toy: number): { a: Season; b: Season; k: number } {
  const n = SEASON_CYCLE.length;
  const first = SEASON_CYCLE[0]!;
  const last = SEASON_CYCLE[n - 1]!;
  if (toy >= last.t || toy < first.t) {
    const span = 1 - last.t + first.t;
    const local = toy >= last.t ? toy - last.t : 1 - last.t + toy;
    return { a: last.season, b: first.season, k: smoothstep(span > 0 ? local / span : 0) };
  }
  for (let i = 0; i < n - 1; i++) {
    const cur = SEASON_CYCLE[i]!;
    const nxt = SEASON_CYCLE[i + 1]!;
    if (toy >= cur.t && toy < nxt.t) {
      return { a: cur.season, b: nxt.season, k: smoothstep((toy - cur.t) / (nxt.t - cur.t)) };
    }
  }
  return { a: first.season, b: first.season, k: 0 };
}

/** Tintes estacionales (por superficie) para un instante del año, ya interpolados. */
export function resolveSeasonTints(timeOfYear: number): SeasonTints {
  const { a, b, k } = bracket(wrap01(timeOfYear));
  const out = {} as SeasonTints;
  for (const s of SEASON_SURFACES) out[s] = lerpRGB(a.tints[s], b.tints[s], k);
  return out;
}

/** Estación dominante (el cuarto del año donde estamos). Para HUD/diagnóstico. */
export function seasonAt(timeOfYear: number): Season {
  const q = Math.floor(wrap01(timeOfYear) * 4) % 4;
  return SEASON_CYCLE[q]!.season;
}

/** `t` del PUNTO MEDIO (máxima expresión) de una estación — el panel de test salta ahí. */
export function seasonPeak(id: SeasonId): number {
  return SEASON_CYCLE.find((s) => s.season.id === id)?.t ?? 0;
}

/**
 * Aplica el tinte estacional del CIELO a los params de atmósfera (sutil, dentro del gamut). El
 * suelo/vegetación los tiñe la ESCENA con resolveSeasonTints + SEASON_STRENGTH. Pura.
 */
export function applySeason(p: AtmosphereParams, skyTint: RGB): AtmosphereParams {
  const s = SEASON_STRENGTH.sky;
  return {
    ...p,
    skyTop: lerpRGB(p.skyTop, skyTint, s),
    skyHorizon: lerpRGB(p.skyHorizon, skyTint, s),
    fogColor: lerpRGB(p.fogColor, skyTint, s),
    ambientColor: lerpRGB(p.ambientColor, skyTint, s),
  };
}
