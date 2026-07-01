/**
 * Biomas (S0.7 v2) — cada bioma define SU PROPIO ciclo día/noche con el mismo
 * cronograma horario que Bosque Celeste (ver presets.ts), su viento base y los
 * climas que pueden ocurrir. Cielos azules con gradiente, niebla baja y tintada.
 */
import type { AtmosphereKeyframe } from './types';
import type { WeatherKind } from './weather';
export type Biome = {
    id: string;
    name: string;
    cycle: AtmosphereKeyframe[];
    windBase: number;
    weathers: WeatherKind[];
};
export declare const BIOMES: Biome[];
export declare function biomeById(id: string): Biome;
//# sourceMappingURL=biomes.d.ts.map