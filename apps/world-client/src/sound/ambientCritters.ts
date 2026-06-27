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
};

export const CRITTERS: readonly Critter[] = [
  // Bosque Celeste
  { name: 'owl', biome: 'bosque-celeste', when: 'night', chance: 0.004 },
  { name: 'frog', biome: 'bosque-celeste', when: 'night', chance: 0.005 },
  { name: 'crow', biome: 'bosque-celeste', when: 'day', chance: 0.003 },
  // Dunas Doradas (desierto) — de día casi no hay aves; un ave rapaz lejana lo llena.
  { name: 'hawk', biome: 'dunas-doradas', when: 'day', chance: 0.004 },
  { name: 'coyote', biome: 'dunas-doradas', when: 'night', chance: 0.004 },
  // Tundra Nevada — muy vacía; aullidos de noche y un ave acuática de día.
  { name: 'wolf', biome: 'tundra-nevada', when: 'night', chance: 0.0035 },
  { name: 'loon', biome: 'tundra-nevada', when: 'day', chance: 0.0035 },
];
