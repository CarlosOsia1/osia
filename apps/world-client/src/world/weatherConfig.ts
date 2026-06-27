/**
 * weatherConfig — CONFIGURACIÓN CENTRAL de los eventos de clima (S0.7).
 *
 * 👉 ÚNICO lugar para tunear las partículas y la niebla de cada clima. Lo leen
 * Precipitation (nieve), RainStreaks (lluvia/arena) y Atmosphere (height-fog).
 * Cambia un número, guarda, y el HMR recarga — sin tocar la lógica.
 *
 * PARÁMETROS SENSIBLES (S2-A3 — afinar con cuidado; tocan el "se ve caro"):
 *  · `*.color` / `*.colorDay` / `*.colorNight` → DEBEN quedar dentro del gamut house-celestial.
 *    Lo verifica `weatherConfigLint.test.ts` (CI). No metas verdes neón ni magentas.
 *  · `count` (nieve 30k, arena 20k, lluvia 5k) → impacta draw calls/relleno; subirlo cuesta fps.
 *  · `FOG.*.strength` y `FOG.niebla.strengthDay/Night` → la densidad de niebla es la palanca de
 *    marca y de rendimiento a la vez; cambios chicos se notan mucho. La transición de intensidad
 *    en el tiempo NO vive aquí (es `tickWeatherDisplay`, que no se toca): aquí solo el TECHO.
 */

/** Semilado (m) de la caja de partículas que sigue a la cámara (evento "infinito"). */
export const FX_BOX = 36;

/** ❄️ NIEVE — blobs low-poly 3D (InstancedMesh; en WebGPU el tamaño SÍ se respeta así). */
export const SNOW = {
  count: 30000, // cantidad de copos
  size: 0.04, // tamaño base de cada copo (súbelo = copos más grandes)
  sizeVar: 1.4, // variación por copo: mide entre 0.6× y (0.6 + sizeVar)× el base
  fall: 3.4, // velocidad de caída
  drift: 1.7, // viento lateral
  color: '#f2f6fb',
  opacity: 0.95,
};

/** 🌧️ LLUVIA — rayas verticales (LineSegments). */
export const RAIN = {
  count: 10000, // cantidad de gotas
  fall: 38, // velocidad de caída
  len: 0.9, // largo de la raya
  colorDay: '#b3c2da', // color de día
  colorNight: '#39435e', // color de noche (se interpola con la hora)
  opacity: 0.55,
};

/** 🏜️ ARENA — rayas horizontales onduladas (LineSegments). */
export const SAND = {
  count: 20000, // cantidad de rayas
  speed: 15, // velocidad horizontal (más alto = más rápida)
  len: 0.5, // largo de la raya
  colorDay: '#cda86a',
  colorNight: '#6e5a40',
  opacity: 0.5,
};

/**
 * 🌫️ HEIGHT-FOG por clima (volumen que envuelve al jugador). strength 0..1 (qué tan
 * densa/opaca); height en metros (hasta dónde sube, se aclara arriba).
 *  · lluvia/nieve → fog propia, baja, con su color.
 *  · niebla/arena → alta; su color = horizonte del cielo (cero costura con el fondo).
 */
export const FOG = {
  rain: { strength: 0.06, height: 6, color: '#8b94a0' }, // gris, baja (como la nieve pero menos)
  snow: { strength: 0.1, height: 12, color: '#e8ebf0' }, // blanca, baja
  niebla: { strengthDay: 0.4, strengthNight: 1.0, height: 16 }, // ← densidad: día 0.4 → medianoche 1.0 (degradado suave)
  sand: { strength: 1.0, height: 38 }, // ← STRENGTH de la tormenta de ARENA
};
