/**
 * WeatherDirector (OSIA-S0.7 · cadencia escasa S2) — el clima AUTORITATIVO del mundo.
 *
 * El clima es ESCASO: por DÍA de juego (un ciclo día/noche de CYCLE_SECONDS) ocurren COMO MÁXIMO
 * `maxEventsPerDay` eventos (lluvia/nieve/arena/niebla), cada uno de 2 a 5 minutos; el resto del
 * día está despejado. La cadencia vive en DATOS por bioma (weatherCycle.ts), no en constantes.
 *
 * El server difunde cada CAMBIO (ATMOSPHERE_UPDATE) y todos los clientes lo sincronizan; la
 * intensidad NO se sirve en escalones: el server fija un objetivo por evento y el CLIENTE la
 * rampa suavemente hacia él (la transición que ya gusta — atmosphereRuntime — no se toca).
 *
 * El día/noche es determinista por tiempo (no se difunde); el clima sí es server-driven.
 * PRNG SEMBRADO (mulberry32): mismo `seed` → misma secuencia → reproducible/testeable.
 */

import {
  biomeById,
  mulberry32,
  weatherProfileFor,
  seasonWeatherBias,
  seasonAt,
  timeOfYearAt,
  CLEAR,
  CYCLE_SECONDS,
  type WeatherKind,
  type WeatherState,
  type WeatherPhaseProfile,
} from '@osia/atmosphere';

/** Un "día de juego" = un ciclo día/noche. El presupuesto de eventos se resetea cada día. */
const DAY_MS = CYCLE_SECONDS * 1000;

export class WeatherDirector {
  readonly biome: string;
  weather: WeatherState = { ...CLEAR };

  private readonly allowed: WeatherKind[];
  private readonly nowMs: () => number;
  private readonly profile: WeatherPhaseProfile;
  private readonly seed: number;
  private readonly rng: () => number;
  private phaseUntil: number;
  private active = false;
  private dayIndex: number; // día de juego actual (para resetear el presupuesto)
  private eventsToday = 0; // eventos de clima ya transcurridos hoy

  constructor(biome: string, nowMs: () => number, seed: number) {
    this.biome = biome;
    this.nowMs = nowMs;
    this.profile = weatherProfileFor(biome);
    this.seed = seed;
    this.rng = mulberry32(seed);
    // Climas no-despejado que este bioma permite (single source of truth: biomes.ts).
    this.allowed = biomeById(biome).weathers.filter((w) => w !== 'despejado');
    this.dayIndex = Math.floor(nowMs() / DAY_MS);
    this.phaseUntil = nowMs() + this.rand(this.profile.gapMs);
  }

  private rand([min, max]: readonly [number, number]): number {
    return min + this.rng() * (max - min);
  }

  /** Evalúa el reloj; muta `weather` y devuelve true si cambió (hay que difundir). */
  update(): boolean {
    const t = this.nowMs();
    // ¿Cambió el día de juego? Resetea el presupuesto de eventos.
    const day = Math.floor(t / DAY_MS);
    if (day !== this.dayIndex) {
      this.dayIndex = day;
      this.eventsToday = 0;
    }
    if (t < this.phaseUntil) return false;

    if (this.active) {
      // Fin del evento → despejar y contar; sigue una espera despejada.
      this.weather = { ...CLEAR };
      this.active = false;
      this.eventsToday += 1;
      this.phaseUntil = t + this.rand(this.profile.gapMs);
      return true;
    }

    // Fin de la espera despejada → ¿arrancar un evento? Solo si quedan eventos para hoy.
    if (this.allowed.length === 0 || this.eventsToday >= this.profile.maxEventsPerDay) {
      this.phaseUntil = t + this.rand(this.profile.gapMs); // hoy ya no hay más clima
      return false;
    }

    // El sesgo de la ESTACIÓN (dentro de los climas del bioma) decide si ocurre y cuál.
    const bias = seasonWeatherBias(this.biome, seasonAt(timeOfYearAt(t)).id);
    if (this.rng() >= bias.eventChance) {
      this.phaseUntil = t + this.rand(this.profile.gapMs); // estación seca: este turno sin clima
      return false;
    }

    const kind = this.pickKind(bias.weights);
    // Objetivo de intensidad [base, pico]; el cliente rampa hacia él (no salta).
    this.weather = { kind, intensity: this.rand(this.profile.intensity) };
    this.active = true;
    this.phaseUntil = t + this.rand(this.profile.eventMs); // 2–5 min
    return true;
  }

  /** Elige un clima permitido del bioma ponderado por la estación (los no listados pesan 1). */
  private pickKind(weights: Partial<Record<WeatherKind, number>>): WeatherKind {
    let total = 0;
    for (const k of this.allowed) total += weights[k] ?? 1;
    let r = this.rng() * total;
    for (const k of this.allowed) {
      r -= weights[k] ?? 1;
      if (r <= 0) return k;
    }
    return this.allowed[this.allowed.length - 1]!;
  }

  /**
   * Estado serializable de la fase actual (S2-B4). NOTA: no captura la posición interna del rng
   * (mulberry32), así que tras restaurar la fase SE REANUDA pero la secuencia FUTURA no será
   * bit-a-bit igual — solo se preserva el clima/fase vigente y el presupuesto del día.
   */
  serialize(): WeatherCheckpoint {
    return {
      seed: this.seed,
      phaseUntil: this.phaseUntil,
      active: this.active,
      weather: { kind: this.weather.kind, intensity: this.weather.intensity },
      dayIndex: this.dayIndex,
      eventsToday: this.eventsToday,
    };
  }

  /** Restaura la fase desde un checkpoint (el día/noche no se persiste: es determinista). */
  restore(cp: WeatherCheckpoint): void {
    this.phaseUntil = cp.phaseUntil;
    this.active = cp.active;
    this.weather = { kind: cp.weather.kind, intensity: cp.weather.intensity };
    this.dayIndex = cp.dayIndex;
    this.eventsToday = cp.eventsToday;
  }
}

/** Estado mínimo y serializable del clima para reanudarlo tras un reinicio (S2-B4). */
export type WeatherCheckpoint = {
  seed: number;
  phaseUntil: number;
  active: boolean;
  weather: WeatherState;
  dayIndex: number;
  eventsToday: number;
};
