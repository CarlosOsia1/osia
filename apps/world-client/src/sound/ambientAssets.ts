'use client';

import type { SeasonId } from '@osia/atmosphere';
import type { AmbientLayer } from './ambientMix';

/**
 * 🔊 Sonidos AMBIENTE (loops). Este es el único lugar que tocas para poner los tuyos (S2-A2):
 *
 *   1) Pon tus archivos (ogg/mp3/opus, en LOOP, cortos y livianos) en:
 *        apps/world-client/public/audio/
 *   2) Referencia su ruta pública aquí, por capa. Dos formas:
 *        · MISMO todo el año:   wind: '/audio/viento.ogg'
 *        · DISTINTO por estación: birds: { primavera: '/audio/aves_primavera.ogg',
 *                                          invierno: '/audio/aves_invierno.ogg' }
 *          (las estaciones que no pongas caen a sintetizado)
 *   3) Deja `null` para que esa capa siga SINTETIZADA por WebAudio (el default de hoy).
 *
 * Si el archivo falta o falla, la capa cae a sintetizada (nunca rompe). La variante estacional se
 * resuelve cuando ENCIENDES el sonido (las estaciones duran ~2 días reales, no cambian a media
 * sesión). Para sonidos de EVENTO (truenos, portal, pasos, UI) ver `sfxAssets.ts`.
 */
export type LayerAsset = string | null | Partial<Record<SeasonId, string>>;

export const AMBIENT_ASSETS: Record<AmbientLayer, LayerAsset> = {
  wind: null, // viento base (suena de día y de noche)
  birds: null, // pájaros — capa de DÍA (admite variante por estación)
  crickets: null, // grillos — capa de NOCHE
  rain: null, // lluvia
  snow: null, // nieve (casi un silencio/hush)
  sand: null, // tormenta de arena (viento con grano)
  fog: null, // niebla (drone bajo, opcional)
};

/** Resuelve la ruta de una capa para la estación vigente (o null = sintetizada). */
export function resolveLayerAsset(asset: LayerAsset, season: SeasonId): string | null {
  if (asset === null || typeof asset === 'string') return asset;
  return asset[season] ?? null;
}
