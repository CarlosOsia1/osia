/**
 * Bus de atmósfera en runtime: los params resueltos del frame actual + el estado
 * del mundo (bioma + clima). Lo escribe <Atmosphere> y lo leen otros componentes
 * (SkyDome, Starfield, Precipitation, HUD) por ref, sin re-render.
 */

import {
  resolveAtmosphere,
  CELESTIAL_CYCLE,
  CLEAR,
  type AtmosphereParams,
  type WeatherState,
} from '@osia/atmosphere';

export const atmo: { current: AtmosphereParams } = {
  current: resolveAtmosphere(0.74, CELESTIAL_CYCLE), // arranca en crepúsculo
};

/** Estado del mundo controlable (bioma + clima). El panel de test lo muta. */
export const world: { biomeId: string; weather: WeatherState } = {
  biomeId: 'bosque-celeste',
  weather: { ...CLEAR },
};
