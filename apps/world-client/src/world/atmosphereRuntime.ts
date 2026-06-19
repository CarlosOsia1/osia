/**
 * Bus de atmósfera en runtime: los params resueltos del frame actual. Lo escribe
 * <Atmosphere> y lo leen otros componentes (Starfield, HUD…) por ref, sin re-render.
 */

import { resolveAtmosphere, CELESTIAL_CYCLE, type AtmosphereParams } from '@osia/atmosphere';

export const atmo: { current: AtmosphereParams } = {
  current: resolveAtmosphere(0.74, CELESTIAL_CYCLE), // arranca en crepúsculo (alma de marca)
};
