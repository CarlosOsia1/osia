/**
 * @osia/shared — Tipos, contratos de red y utilidades compartidas del ecosistema OSIA.
 *
 * Stub de Fase 0 · OSIA-S0.1. Los contratos reales (eventos WS, tipos de mundo,
 * world ticket) se llenan en OSIA-S0.4 / S0.5. Ver docs/10-contratos-api-eventos.md.
 */

export const OSIA = {
  name: 'OSIA',
  tagline: 'El arte de lo esencial',
} as const;

/** Identificadores de las superficies (apps) del ecosistema. */
export type OsiaSurfaceId = 'mundo' | 'social' | 'juegos';
