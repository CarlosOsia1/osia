'use client';

/**
 * 🔔 Sonidos de EVENTO y de VIDA (one-shots): suenan UNA vez cuando pasa algo, a diferencia del
 * AMBIENTE (loops continuos, ver ambientAssets.ts). Dos familias:
 *   · Eventos     → truenos, portal, pasos, UI.
 *   · Animales    → llamados ocasionales que dan VIDA al bioma (búho, halcón, coyote, lobo…).
 *                   CUÁNDO suena cada animal (bioma/hora/rareza) se define en `ambientCritters.ts`.
 *
 * Para ponerlos: archivo CORTO y seco en apps/world-client/public/audio/ y su ruta aquí. `null` =
 * ese sonido no suena (los one-shots NO se sintetizan: necesitan archivo real). Se disparan con
 * `ambientDriver.playSfx(name)` (los animales, automático; los eventos, desde su sistema).
 */
export type SfxName =
  // Eventos
  | 'thunder' // trueno (ya enganchado: lluvia fuerte)
  | 'portal' // cruzar un portal (Fase futura)
  | 'footstep' // pasos del jugador
  | 'ui' // click/confirmación de interfaz
  // Animales — bosque
  | 'owl' // búho (noche)
  | 'frog' // rana/sapo (noche)
  | 'crow' // cuervo/grajo lejano (día)
  // Animales — desierto
  | 'hawk' // ave rapaz, grito solitario (día) → llena el desierto vacío
  | 'coyote' // aullido de coyote (noche)
  // Animales — tundra
  | 'wolf' // aullido de lobo (noche)
  | 'loon'; // ave acuática ártica, llamado lejano (día)

export const SFX_ASSETS: Record<SfxName, string | null> = {
  thunder: null,
  portal: null,
  footstep: null,
  ui: null,
  owl: null,
  frog: null,
  crow: null,
  hawk: null,
  coyote: null,
  wolf: null,
  loon: null,
};
