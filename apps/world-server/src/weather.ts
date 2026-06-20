/**
 * WeatherDirector (OSIA-S0.7) — el clima AUTORITATIVO del mundo, del lado del server.
 *
 * Por bioma elige climas PERMITIDOS (nada cruzado: Bosque → lluvia/niebla, Tundra →
 * nieve/niebla, Dunas → arena), con transiciones AUTOMÁTICAS: períodos despejados
 * intercalados con eventos de clima de duración aleatoria. El server difunde cada
 * cambio (ATMOSPHERE_UPDATE) y TODOS los clientes lo sincronizan; el cliente solo
 * suaviza la rampa de intensidad localmente.
 *
 * El día/noche es determinista por tiempo (no se difunde); el clima sí es server-driven.
 */

import { biomeById, type WeatherKind } from '@osia/atmosphere';

export type DirectorWeather = { kind: WeatherKind; intensity: number };

// Duraciones (ms). Cortas para Fase 0 (se ve cambiar el clima sin esperar demasiado).
const CLEAR_MIN = 30_000;
const CLEAR_MAX = 75_000;
const ACTIVE_MIN = 30_000;
const ACTIVE_MAX = 70_000;

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export class WeatherDirector {
  readonly biome: string;
  weather: DirectorWeather = { kind: 'despejado', intensity: 0 };

  private readonly allowed: WeatherKind[];
  private readonly nowMs: () => number;
  private phaseUntil: number;
  private active = false;

  constructor(biome: string, nowMs: () => number) {
    this.biome = biome;
    this.nowMs = nowMs;
    // Climas no-despejado que este bioma permite (single source of truth: biomes.ts).
    this.allowed = biomeById(biome).weathers.filter((w) => w !== 'despejado');
    this.phaseUntil = nowMs() + rand(CLEAR_MIN, CLEAR_MAX);
  }

  /** Evalúa el reloj; muta `weather` y devuelve true si cambió (hay que difundir). */
  update(): boolean {
    const t = this.nowMs();
    if (t < this.phaseUntil) return false;

    if (this.active) {
      // Fin del clima → despejar.
      this.weather = { kind: 'despejado', intensity: 0 };
      this.active = false;
      this.phaseUntil = t + rand(CLEAR_MIN, CLEAR_MAX);
      return true;
    }

    // Fin del despejado → arrancar un clima permitido (si hay).
    if (this.allowed.length === 0) {
      this.phaseUntil = t + rand(CLEAR_MIN, CLEAR_MAX);
      return false;
    }
    const kind = this.allowed[Math.floor(Math.random() * this.allowed.length)]!;
    this.weather = { kind, intensity: 0.7 + Math.random() * 0.3 }; // 0.7–1.0
    this.active = true;
    this.phaseUntil = t + rand(ACTIVE_MIN, ACTIVE_MAX);
    return true;
  }
}
