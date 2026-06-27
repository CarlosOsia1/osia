/**
 * Esquema Zod del contrato de atmósfera en el cable (S2-B3). Valida el clima que difunde el
 * server ANTES de tocar el render: kind del catálogo e intensity ∈ [0,1]. Es rechazo seguro
 * (degradación a despejado/clamp), nunca confianza ciega en el f64 crudo del DataView.
 *
 * Versionado por ATMOSPHERE_CONTRACT_VERSION (constants.ts), aparte de PROTOCOL_VERSION.
 * La lista de kinds vive UNA sola vez en @osia/atmosphere (WEATHER_KINDS); aquí se deriva,
 * no se redeclara (DRY, evita drift).
 */

import { z } from 'zod';
import { WEATHER_KINDS, isWeatherKind } from '@osia/atmosphere';
import type { WeatherKind, WeatherState } from '@osia/atmosphere';

/** Contrato estricto del clima difundido: kind ∈ catálogo, intensity normalizada [0,1]. */
export const weatherStateSchema = z.object({
  kind: z.enum(WEATHER_KINDS),
  intensity: z.number().min(0).max(1),
});
export type WeatherStateContract = z.infer<typeof weatherStateSchema>;

/**
 * Lee un WeatherState desde el cable de forma SEGURA (la usa el codec al decodificar): valida
 * contra el esquema y, si los datos vienen corruptos (kind desconocido de un cliente viejo,
 * intensity fuera de [0,1] o NaN), DEGRADA a un valor seguro en lugar de lanzar — un frame
 * mentiroso no debe tumbar la conexión ni el render (mantiene el rechazo graceful del codec).
 */
export function safeWeatherFromWire(kind: string, intensity: number): WeatherState {
  const parsed = weatherStateSchema.safeParse({ kind, intensity });
  if (parsed.success) return parsed.data;
  const safeKind: WeatherKind = isWeatherKind(kind) ? kind : 'despejado';
  const safeIntensity = Number.isFinite(intensity) ? Math.min(1, Math.max(0, intensity)) : 0;
  return { kind: safeKind, intensity: safeIntensity };
}
