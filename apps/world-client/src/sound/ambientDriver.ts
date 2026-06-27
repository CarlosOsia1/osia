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

class AmbientDriver {
  private readonly engine = new AmbientEngine();
  private timer: ReturnType<typeof setInterval> | null = null;

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
    this.engine.setMix(mix);
    this.engine.updateMaster(true, meshVoice.isSpeaking());

    // Truenos ocasionales durante lluvia fuerte (solo suena si pusiste el archivo de SFX).
    if (world.weather.kind === 'lluvia' && world.weather.intensity > 0.6 && Math.random() < 0.012) {
      void this.engine.playSfx('thunder');
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
