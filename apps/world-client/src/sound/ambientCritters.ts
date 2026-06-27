'use client';

import type { SfxName } from './sfxAssets';

/**
 * Llamados de animales que dan VIDA al mundo (S2-A2): one-shots que suenan CADA TANTO según el
 * bioma y la hora (búho de noche en el bosque, halcón de día en el desierto, lobo en la tundra…).
 * Es lo que hace que un bioma "vacío" (desierto de día, tundra) se sienta vivo sin un loop de fondo.
 *
 * El driver, en clima calmo, recorre esta tabla y dispara el llamado con probabilidad `chance` por
 * tick (cada 200 ms). Solo suena si pusiste el archivo en SFX_ASSETS (si es null, no pasa nada).
 * EXTENSIBLE: agregar un animal = una fila aquí + su entrada en SfxName/SFX_ASSETS + el archivo.
 */
export type Critter = {
  name: SfxName;
  biome: string | 'any';
  when: 'day' | 'night' | 'any';
  /** Probabilidad por tick (200 ms). 0.004 ≈ un llamado cada ~50 s en promedio. */
  chance: number;
  /**
   * Presencia/volumen del llamado (0..1): BAJO = lejano/pequeño, ALTO = cerca. Se mantiene bajo a
   * propósito: la vida del mundo es de animales pequeños o LEJANOS, nunca algo que suene "encima"
   * del jugador (acechante). Es la perilla para afinar a oído qué tan cerca se siente cada animal.
   */
  gain: number;
};

export const CRITTERS: readonly Critter[] = [
  // Bosque Celeste — un búho cercano-suave de noche, una rana pequeña, un cuervo lejano de día.
  { name: 'owl', biome: 'bosque-celeste', when: 'night', chance: 0.004, gain: 0.4 },
  { name: 'frog', biome: 'bosque-celeste', when: 'night', chance: 0.005, gain: 0.32 },
  { name: 'crow', biome: 'bosque-celeste', when: 'day', chance: 0.003, gain: 0.3 },
  // Dunas Doradas (desierto) — el bioma más vacío. De día, un ave rapaz lejana ("flying away"). De
  // noche, un búho LEJANO lo llena sin coyote acechante (los búhos también viven en el desierto).
  { name: 'hawk', biome: 'dunas-doradas', when: 'day', chance: 0.004, gain: 0.32 },
  { name: 'owl', biome: 'dunas-doradas', when: 'night', chance: 0.003, gain: 0.26 },
  // Tundra Nevada — un ave acuática lejana de día. (El lobo de noche queda diferido: aullido = acecho.)
  { name: 'loon', biome: 'tundra-nevada', when: 'day', chance: 0.0035, gain: 0.34 },
  // Depredadores DIFERIDOS (asset null = silenciosos hoy). Si se agregan, suenan LEJOS (presencia
  // baja), nunca encima del jugador. Ver la nota en sfxAssets.ts.
  { name: 'coyote', biome: 'dunas-doradas', when: 'night', chance: 0.003, gain: 0.2 },
  { name: 'wolf', biome: 'tundra-nevada', when: 'night', chance: 0.003, gain: 0.2 },
];
