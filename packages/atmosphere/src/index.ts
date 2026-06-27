/**
 * @osia/atmosphere — Motor de Atmósfera de OSIA (lógica PURA compartida).
 * Sin Three.js, sin red, sin DB, sin Date.now: cliente y servidor resuelven el
 * MISMO cielo desde (timeOfDay, presets). Ver docs/06-motor-atmosfera.md.
 */

export * from './types';
export * from './math';
export * from './color';
export * from './housePalette';
export * from './presets';
export * from './resolve';
export * from './clock';
export * from './weather';
export * from './biomes';
export * from './seasons';
export * from './seasonWeather';
export * from './weatherCycle';
export * from './hud';
