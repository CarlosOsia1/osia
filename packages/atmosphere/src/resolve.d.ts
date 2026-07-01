/**
 * resolveAtmosphere — función PURA: dado timeOfDay (0..1) y un ciclo de keyframes,
 * devuelve los AtmosphereParams interpolados. Idéntica en cliente y servidor →
 * casi no hay que transmitir nada (determinismo). (S0.7-H1)
 */
import type { AtmosphereParams, AtmosphereKeyframe, Vec3 } from './types';
/** Dirección hacia el sol según la hora: sale por el este, cenit a mediodía, se pone al oeste. */
export declare function sunDirFor(t: number): Vec3;
/** La luna, opuesta al sol (arriba de noche). */
export declare function moonDirFor(t: number): Vec3;
/** Params SIN direcciones: lo único interpolable entre keyframes. Las direcciones sol/luna
 *  son analíticas por hora (sunDirFor/moonDirFor), no se interpolan entre keyframes. */
export type LerpableParams = Omit<AtmosphereParams, 'sunDir' | 'moonDir'>;
/**
 * Interpola los params interpolables entre dos keyframes. NO toca sunDir/moonDir (no son
 * suyas: las compone resolveAtmosphere por hora). Función correcta por sí sola (sin parche externo).
 */
export declare function lerpParams(a: AtmosphereParams, b: AtmosphereParams, k: number): LerpableParams;
export declare function resolveAtmosphere(t: number, cycle: AtmosphereKeyframe[]): AtmosphereParams;
//# sourceMappingURL=resolve.d.ts.map