/**
 * @osia/shared — Tipos, contratos de red y utilidades compartidas del ecosistema OSIA.
 */

export const OSIA = {
  name: 'OSIA',
  tagline: 'El arte de lo esencial',
} as const;

/** Identificadores de las superficies (apps) del ecosistema. */
export type OsiaSurfaceId = 'mundo' | 'social' | 'juegos';

// --- Contrato de red (mundo en tiempo real) ---
export * from './net/opcodes';
export * from './net/constants';
export * from './net/movement';
export * from './net/messages';
export * from './net/codec';
