/**
 * Bus de atmósfera en runtime: los params resueltos del frame + el estado del mundo
 * (bioma + clima). Lo escribe <Atmosphere> y lo leen otros componentes (SkyDome,
 * Starfield, Precipitation, RainStreaks, HUD) por ref, sin re-render.
 *
 * El CLIMA es server-authoritative:
 *  - live*     = lo que dicta el SERVER (sincronizado entre todos los conectados).
 *  - override* = preview LOCAL del panel de test (null = seguir al server).
 *  - biomeId / weather = lo que se RENDERIZA: el objetivo activo (override ?? live)
 *    con una rampa suave de intensidad. Los consumidores leen SOLO biomeId/weather.
 */

import {
  resolveAtmosphere,
  CELESTIAL_CYCLE,
  type AtmosphereParams,
  type WeatherState,
} from '@osia/atmosphere';

export const atmo: { current: AtmosphereParams } = {
  current: resolveAtmosphere(0.74, CELESTIAL_CYCLE), // arranca en crepúsculo
};

const DEFAULT_BIOME = 'bosque-celeste';
const clear = (): WeatherState => ({ kind: 'despejado', intensity: 0 });

export const world = {
  // estado EN VIVO del server (autoritativo)
  liveBiomeId: DEFAULT_BIOME,
  liveWeather: clear(),
  // override LOCAL del panel de test; null = seguir al server
  overrideBiomeId: null as string | null,
  overrideWeather: null as WeatherState | null,
  // lo que se RENDERIZA (rampa suave hacia el objetivo activo)
  biomeId: DEFAULT_BIOME,
  weather: clear(),
};

/** Aplica el estado de atmósfera que llega del server (autoritativo). El `kind` ya viene
 *  validado como WeatherKind por el codec (decode), sin casts inseguros. */
export function applyServerAtmosphere(biome: string, weather: WeatherState): void {
  world.liveBiomeId = biome;
  world.liveWeather = { kind: weather.kind, intensity: weather.intensity };
}

/** El panel de test escribe estos overrides (preview LOCAL, no afecta a otros). */
export function setOverrideBiome(id: string | null): void {
  world.overrideBiomeId = id;
}
export function setOverrideWeather(w: WeatherState | null): void {
  world.overrideWeather = w;
}
export function clearOverrides(): void {
  world.overrideBiomeId = null;
  world.overrideWeather = null;
}
/** ¿El panel está overrideando el clima/bioma del server? */
export function isOverriding(): boolean {
  return world.overrideBiomeId !== null || world.overrideWeather !== null;
}

const RAMP = 0.4; // intensidad por segundo (≈2.5 s para 0→1)

/**
 * Rampa suave del clima MOSTRADO hacia el objetivo activo (override ?? live). El
 * bioma se conmuta directo; el clima cae a 0 antes de cambiar de tipo (cross suave).
 */
export function tickWeatherDisplay(deltaSec: number): void {
  world.biomeId = world.overrideBiomeId ?? world.liveBiomeId;
  const target = world.overrideWeather ?? world.liveWeather;
  const cur = world.weather;
  if (cur.kind !== target.kind) {
    cur.intensity = Math.max(0, cur.intensity - RAMP * deltaSec);
    if (cur.intensity <= 0.001) {
      cur.kind = target.kind;
      cur.intensity = 0;
    }
  } else {
    const d = target.intensity - cur.intensity;
    const step = RAMP * deltaSec;
    cur.intensity += Math.abs(d) <= step ? d : Math.sign(d) * step;
  }
}
