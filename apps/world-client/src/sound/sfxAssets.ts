'use client';

/**
 * 🔔 Sonidos de EVENTO (one-shots): truenos, portal, pasos, clicks de UI. A diferencia del
 * AMBIENTE (loops continuos, ver ambientAssets.ts), estos suenan UNA vez cuando pasa algo.
 *
 * Para ponerlos: archivo en apps/world-client/public/audio/ y su ruta aquí. `null` = ese evento
 * NO suena (los one-shots NO se sintetizan: necesitan archivo real). Se disparan con
 * `ambientDriver.playSfx(name)` — el de truenos ya está enganchado a la lluvia fuerte; los demás
 * se llaman desde su sistema cuando exista (portal/pasos/UI).
 */
export type SfxName = 'thunder' | 'portal' | 'footstep' | 'ui';

export const SFX_ASSETS: Record<SfxName, string | null> = {
  thunder: null, // trueno — se dispara solo durante lluvia fuerte (cuando pongas el archivo)
  portal: null, // cruzar un portal (Fase futura) — llamar playSfx('portal')
  footstep: null, // pasos del jugador — llamar playSfx('footstep') desde el movimiento
  ui: null, // click/confirmación de interfaz — llamar playSfx('ui')
};
