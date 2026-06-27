'use client';

/**
 * ambientDriver (S2-A2) — puente entre el estado del mundo y el motor de audio. Singleton fuera
 * de React: cuando está activo, muestrea (a baja frecuencia; el cielo cambia lento) el bioma, el
 * clima y la hora, calcula la mezcla pura (ambientMix) y la aplica al AmbientEngine, atenuando
 * ante voz P2P (ducking). El motor no conoce el mundo (desacoplado); el driver los une.
 */

import { clamp01, seasonAt, type SeasonId } from '@osia/atmosphere';
import { ambientMix } from './ambientMix';
import { AmbientEngine } from './AmbientEngine';
import type { SfxName } from './sfxAssets';
import { CRITTERS } from './ambientCritters';
import { atmo, world } from '../world/atmosphereRuntime';
import { worldClock } from '../world/worldClockRuntime';
import { meshVoice } from '../voice/MeshVoice';

const SAMPLE_MS = 200; // refresco de la mezcla (no necesita 60 fps)

/** "Vivacidad" sonora por estación (escala los pájaros): primavera/verano vivos, invierno apagado. */
const SEASON_LIVELINESS: Record<SeasonId, number> = {
  primavera: 1,
  verano: 0.95,
  otono: 0.65,
  invierno: 0.4,
};

// Fases aleatorias (una vez) para que pájaros y grillos varíen INDEPENDIENTES y no en patrón fijo.
const rndPhases = (): readonly number[] => [
  Math.random() * 6.283,
  Math.random() * 6.283,
  Math.random() * 6.283,
];
const BIRD_PHASES = rndPhases();

/**
 * Envolvente ORGÁNICA 0..1 para los PÁJAROS: no cantan el 100% del tiempo — entran y se van por
 * ratos largos (suma de ondas lentas + umbral que a veces los calla del todo). El motor suaviza
 * con crossfade, así que las entradas/salidas quedan naturales, no un interruptor.
 */
function organicGate(t: number, p: readonly number[]): number {
  const s =
    Math.sin(t * 0.045 + p[0]!) * 0.55 +
    Math.sin(t * 0.017 + p[1]!) * 0.45 +
    Math.sin(t * 0.085 + p[2]!) * 0.3;
  const v = (s + 1.3) / 2.6; // ~0..1
  if (v <= 0.4) return 0; // silencio natural por ratos
  const x = (v - 0.4) / 0.6;
  return x * x * (3 - 2 * x); // smoothstep al subir
}

const CRICKET_ON: readonly [number, number] = [2, 3]; // s cantando (chirrido)
const CRICKET_OFF: readonly [number, number] = [10, 15]; // s en silencio
const rand = ([min, max]: readonly [number, number]): number => min + Math.random() * (max - min);

class AmbientDriver {
  private readonly engine = new AmbientEngine();
  private timer: ReturnType<typeof setInterval> | null = null;
  // Grillos en BURSTS: cantan ~2-3 s y callan ~10-15 s (estado, no envolvente continua).
  private cricketOn = false;
  private cricketUntil = 0;

  private cricketBurst(nowSec: number): number {
    if (nowSec >= this.cricketUntil) {
      this.cricketOn = !this.cricketOn;
      this.cricketUntil = nowSec + rand(this.cricketOn ? CRICKET_ON : CRICKET_OFF);
    }
    return this.cricketOn ? 1 : 0;
  }

  /** Arranca (DEBE venir de un gesto del usuario: priming del AudioContext). */
  async start(): Promise<void> {
    await this.engine.start(seasonAt(worldClock.toy).id); // resuelve assets de la estación vigente
    if (this.timer === null) {
      this.timer = setInterval(() => this.tick(), SAMPLE_MS);
      this.tick();
    }
  }

  /** Dispara un sonido de EVENTO (one-shot). Lo usan futuros sistemas: portal, pasos, UI… */
  playSfx(name: SfxName): void {
    void this.engine.playSfx(name);
  }

  private tick(): void {
    const night = clamp01(atmo.current.starsIntensity); // 0 día → 1 noche
    const liveliness = SEASON_LIVELINESS[seasonAt(worldClock.toy).id]; // sonido estacional
    const mix = ambientMix(world.biomeId, world.weather.kind, world.weather.intensity, night, liveliness);

    // Naturalidad: los pájaros van y vienen por ratos largos; los grillos cantan en bursts cortos.
    const t = performance.now() / 1000;
    mix.birds *= organicGate(t, BIRD_PHASES);
    mix.crickets *= this.cricketBurst(t);

    this.engine.setMix(mix);
    this.engine.updateMaster(true, meshVoice.isSpeaking());

    // Truenos ocasionales durante lluvia fuerte (solo suena si pusiste el archivo de SFX).
    if (world.weather.kind === 'lluvia' && world.weather.intensity > 0.6 && Math.random() < 0.012) {
      void this.engine.playSfx('thunder');
    }

    // VIDA: llamados de animales según bioma y hora (búho, halcón, lobo…), solo en clima calmo.
    const isDay = night < 0.4;
    const calm = world.weather.kind === 'despejado' || world.weather.intensity < 0.5;
    if (calm) {
      for (const c of CRITTERS) {
        if (c.biome !== 'any' && c.biome !== world.biomeId) continue;
        if ((c.when === 'day' && !isDay) || (c.when === 'night' && isDay)) continue;
        if (Math.random() < c.chance) void this.engine.playSfx(c.name, c.gain); // presencia = lejanía
      }
    }
  }

  /** Detiene la mezcla y baja el master a silencio (no cierra el contexto: re-arranque rápido). */
  stop(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.engine.updateMaster(false, false);
  }

  /** Libera el motor por completo (al salir del mundo) — sin fugas de audio (§7). */
  async dispose(): Promise<void> {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
    await this.engine.dispose();
  }
}

export const ambientDriver = new AmbientDriver();
