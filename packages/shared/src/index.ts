/**
 * @osia/shared — Tipos, contratos de red y utilidades compartidas del ecosistema OSIA.
 */

export const OSIA = {
  name: 'OSIA',
  tagline: 'El arte de lo esencial',
} as const;

/** Identificadores de las superficies (apps) del ecosistema. */
export type OsiaSurfaceId = 'mundo' | 'social' | 'juegos';

// --- Identificadores y enums de dominio (branded + espejo de los CHECK del ER) ---
export * from './domain/ids';
export * from './domain/enums';
export * from './domain/reputation';

// --- Contratos REST (sobre de error, paginación, DTOs de identidad) ---
export * from './rest';

// --- Esquemas Zod (validación REST en servidor + formularios en cliente) ---
export * from './schemas';

// --- Catálogo declarativo de experiencias del Vestíbulo ---
export * from './catalog/experiences';

// --- Catálogo de eventos de dominio (Tejido Social, Fase 3) ---
export * from './catalog/events';

// --- Constantes de auth/SSO (cookie de refresh compartida) ---
export * from './auth';

// --- Contrato de red (mundo en tiempo real) ---
export * from './net/opcodes';
export * from './net/constants';
export * from './net/movement';
export * from './net/entities';
export * from './net/messages';
export * from './net/codec';
export * from './net/voiceState';
export * from './net/schemas/atmosphere';

// --- Layout del mundo (obstáculos: render + spawn-safety) ---
export * from './world/layout';

// --- Utilidades de texto ---
export * from './text/sanitizeChat';
export * from './text/mentions';

// --- Utilidades de entorno ---
export * from './util/env-list';

// --- Tipos del Motor de Atmósfera (única superficie de import; S0.7-H1) ---
// Re-exportados para que cliente y servidor consuman los MISMOS tipos del cielo
// desde @osia/shared. La lógica vive en @osia/atmosphere (pura); aquí solo el contrato.
export type {
  AtmosphereParams,
  AtmosphereKeyframe,
  AtmosphereEventPolicy,
  WeatherKind,
  WeatherState,
  RGB,
  Vec3,
} from '@osia/atmosphere';
