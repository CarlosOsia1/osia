/**
 * @osia/shared — Tipos, contratos de red y utilidades compartidas del ecosistema OSIA.
 */

export const OSIA = {
  name: 'OSIA',
  tagline: 'El arte de lo esencial',
} as const;

/** Identificadores de las superficies (apps) del ecosistema. */
export type OsiaSurfaceId = 'mundo' | 'social' | 'juegos';

// --- Identificadores de dominio (branded, anti primitive-obsession) ---
export * from './domain/ids';

// --- Contrato de red (mundo en tiempo real) ---
export * from './net/opcodes';
export * from './net/constants';
export * from './net/movement';
export * from './net/entities';
export * from './net/messages';
export * from './net/codec';
export * from './net/voiceState';

// --- Utilidades de texto ---
export * from './text/sanitizeChat';

// --- Tipos del Motor de Atmósfera (única superficie de import; S0.7-H1) ---
// Re-exportados para que cliente y servidor consuman los MISMOS tipos del cielo
// desde @osia/shared. La lógica vive en @osia/atmosphere (pura); aquí solo el contrato.
export type {
  AtmosphereParams,
  AtmosphereKeyframe,
  AtmosphereEventPolicy,
  WeatherKind,
  RGB,
  Vec3,
} from '@osia/atmosphere';
