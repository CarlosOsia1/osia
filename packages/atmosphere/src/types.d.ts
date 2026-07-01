/** Tipos del motor de atmósfera (versión 1, S0.7). */
export type RGB = readonly [number, number, number];
export type Vec3 = readonly [number, number, number];
/** Lo que el renderer consume cada frame. Todo interpolable. */
export type AtmosphereParams = {
    skyTop: RGB;
    skyHorizon: RGB;
    fogColor: RGB;
    fogDensity: number;
    sunDir: Vec3;
    sunColor: RGB;
    sunIntensity: number;
    moonDir: Vec3;
    moonColor: RGB;
    moonIntensity: number;
    ambientColor: RGB;
    ambientIntensity: number;
    exposure: number;
    bloom: number;
    starsIntensity: number;
};
/** Un preset celestial anclado a un momento del ciclo (timeOfDay 0..1). */
export type AtmosphereKeyframe = {
    t: number;
    name: string;
    params: AtmosphereParams;
};
/** Política de evento efímero (S0.7-H5; declarada aquí, programada en el server). */
export type AtmosphereEventPolicy = {
    id: string;
    rarityPerDay: number;
    hourBias: [number, number];
};
//# sourceMappingURL=types.d.ts.map