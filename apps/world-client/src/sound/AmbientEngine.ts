'use client';

/**
 * AmbientEngine (S2-A2) — motor de paisaje sonoro por WebAudio, SINTETIZADO (sin assets): cada
 * capa es ruido filtrado (timbre por filtro) y los grillos son ruido agudo modulado en amplitud.
 * Así el mundo suena sin depender de archivos de audio; si más adelante se quieren loops grabados,
 * el motor ya queda listo para enchufarlos (sustituir las fuentes por AudioBufferSourceNode de loop).
 *
 * Imperativo y FUERA de React (como SpatialGraph/MeshVoice): nodos creados en setup (cero
 * asignaciones por frame), ganancias con crossfade (setTargetAtTime), y dispose() disciplinado
 * (la GC del navegador NO libera audio: hay que detener fuentes y cerrar el AudioContext).
 */

import { mulberry32, type SeasonId } from '@osia/atmosphere';
import { AMBIENT_LAYERS, type AmbientLayer, type AmbientMix } from './ambientMix';
import { AMBIENT_ASSETS, resolveLayerAsset } from './ambientAssets';
import { SFX_ASSETS, type SfxName } from './sfxAssets';

const MASTER_GAIN = 0.5; // techo del ambiente (acompaña, no invade)
const VOICE_DUCK = 0.32; // factor del master mientras hay voz P2P activa (ducking)
const FADE_TC = 0.4; // constante de tiempo del crossfade (≈ transición suave de ~1 s)
const NOISE_SECONDS = 2;

type Layer = { gain: GainNode; nodes: AudioNode[]; sources: AudioScheduledSourceNode[] };

/** Ruido blanco determinista (mulberry32) en un buffer reutilizable; una asignación en setup. */
function makeNoise(ctx: BaseAudioContext, seconds: number): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  const rng = mulberry32(0x51ed2700);
  for (let i = 0; i < len; i++) data[i] = rng() * 2 - 1;
  return buf;
}

export class AmbientEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private readonly layers = new Map<AmbientLayer, Layer>();
  private readonly sfxBuffers = new Map<SfxName, AudioBuffer | null>();
  private running = false;

  /** Crea/reanuda el AudioContext (DEBE venir de un gesto del usuario) y arranca las capas. */
  async start(season: SeasonId): Promise<void> {
    if (!this.ctx) await this.build(season);
    if (this.ctx && this.ctx.state === 'suspended') await this.ctx.resume();
    this.running = true;
  }

  isRunning(): boolean {
    return this.running;
  }

  private async build(season: SeasonId): Promise<void> {
    const ctx = new AudioContext();
    this.ctx = ctx;
    this.noise = makeNoise(ctx, NOISE_SECONDS);
    const master = ctx.createGain();
    master.gain.value = 0; // arranca en silencio; updateMaster lo sube con fade
    master.connect(ctx.destination);
    this.master = master;
    const assets = await this.loadAssetBuffers(ctx, season); // tus archivos, si los hay (S2-A2)
    for (const id of AMBIENT_LAYERS)
      this.layers.set(id, this.buildLayer(ctx, id, master, assets.get(id) ?? null));
  }

  /** Carga y decodifica los archivos de AMBIENT_ASSETS para la estación vigente (los no-null). */
  private async loadAssetBuffers(
    ctx: AudioContext,
    season: SeasonId,
  ): Promise<Map<AmbientLayer, AudioBuffer>> {
    const out = new Map<AmbientLayer, AudioBuffer>();
    await Promise.all(
      AMBIENT_LAYERS.map(async (id) => {
        const url = resolveLayerAsset(AMBIENT_ASSETS[id], season);
        if (!url) return;
        try {
          const res = await fetch(url);
          out.set(id, await ctx.decodeAudioData(await res.arrayBuffer()));
        } catch {
          /* archivo ausente/ilegible → esa capa cae a sintetizada */
        }
      }),
    );
    return out;
  }

  /**
   * Reproduce un sonido de EVENTO (one-shot: trueno, portal, paso, UI). Solo suena si hay archivo
   * en SFX_ASSETS (los one-shots no se sintetizan). Carga el buffer la 1ª vez y lo cachea.
   */
  async playSfx(name: SfxName, gainValue = 0.6): Promise<void> {
    if (!this.ctx || !this.running) return;
    const url = SFX_ASSETS[name];
    if (!url) return;
    let buf = this.sfxBuffers.get(name);
    if (buf === undefined) {
      try {
        const res = await fetch(url);
        buf = await this.ctx.decodeAudioData(await res.arrayBuffer());
      } catch {
        buf = null; // archivo ausente → no reintentar
      }
      this.sfxBuffers.set(name, buf);
    }
    if (!buf || !this.ctx) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain();
    g.gain.value = gainValue;
    src.connect(g);
    g.connect(this.ctx.destination);
    src.onended = () => {
      src.disconnect();
      g.disconnect();
    };
    src.start();
  }

  private buildLayer(
    ctx: AudioContext,
    id: AmbientLayer,
    master: GainNode,
    assetBuffer: AudioBuffer | null,
  ): Layer {
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.connect(master);

    // Tu archivo manda: si esta capa tiene asset, se reproduce tal cual (en loop), sin filtro.
    if (assetBuffer) {
      const file = ctx.createBufferSource();
      file.buffer = assetBuffer;
      file.loop = true;
      file.connect(gain);
      file.start();
      return { gain, nodes: [], sources: [file] };
    }

    // Sin asset → capa SINTETIZADA (ruido filtrado; los grillos con modulación de amplitud).
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    switch (id) {
      case 'wind': filter.type = 'lowpass'; filter.frequency.value = 420; filter.Q.value = 0.6; break;
      case 'birds': filter.type = 'bandpass'; filter.frequency.value = 3200; filter.Q.value = 5; break;
      case 'rain': filter.type = 'highpass'; filter.frequency.value = 1200; filter.Q.value = 0.7; break;
      case 'sand': filter.type = 'bandpass'; filter.frequency.value = 760; filter.Q.value = 0.8; break;
      case 'snow': filter.type = 'lowpass'; filter.frequency.value = 240; filter.Q.value = 0.5; break;
      case 'fog': filter.type = 'lowpass'; filter.frequency.value = 180; filter.Q.value = 0.4; break;
      case 'crickets': filter.type = 'bandpass'; filter.frequency.value = 4200; filter.Q.value = 6; break;
    }
    src.connect(filter);

    const nodes: AudioNode[] = [filter];
    const sources: AudioScheduledSourceNode[] = [src];

    // Grillos y pájaros: amplitud modulada (un LFO abre/cierra un gain) → pulso de insectos / trino.
    // Los grillos pulsan rápido; los pájaros, lento. (Placeholder sintetizado hasta poner assets.)
    if (id === 'crickets' || id === 'birds') {
      const am = ctx.createGain();
      am.gain.value = 0.5;
      filter.connect(am);
      am.connect(gain);
      const lfo = ctx.createOscillator();
      lfo.type = 'square';
      lfo.frequency.value = id === 'birds' ? 2.5 : 9;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 0.5;
      lfo.connect(lfoGain);
      lfoGain.connect(am.gain);
      lfo.start();
      nodes.push(am, lfoGain);
      sources.push(lfo);
    } else {
      filter.connect(gain);
    }

    src.start();
    return { gain, nodes, sources };
  }

  /** Aplica la mezcla (ganancia por capa) con crossfade suave. */
  setMix(mix: AmbientMix): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    for (const id of AMBIENT_LAYERS) {
      const layer = this.layers.get(id);
      layer?.gain.gain.setTargetAtTime(mix[id], now, FADE_TC);
    }
  }

  /** Master: 0 si está deshabilitado; atenuado si hay voz P2P activa (ducking). */
  updateMaster(enabled: boolean, voiceActive: boolean): void {
    if (!this.ctx || !this.master) return;
    const target = enabled ? (voiceActive ? MASTER_GAIN * VOICE_DUCK : MASTER_GAIN) : 0;
    this.master.gain.setTargetAtTime(target, this.ctx.currentTime, FADE_TC);
  }

  /** Libera TODO: detiene fuentes, desconecta nodos y cierra el AudioContext (sin fugas, §7). */
  async dispose(): Promise<void> {
    this.running = false;
    for (const layer of this.layers.values()) {
      for (const s of layer.sources) {
        try {
          s.stop();
        } catch {
          /* ya detenida */
        }
        s.disconnect();
      }
      for (const n of layer.nodes) n.disconnect();
      layer.gain.disconnect();
    }
    this.layers.clear();
    this.sfxBuffers.clear();
    this.master?.disconnect();
    this.master = null;
    if (this.ctx) {
      try {
        await this.ctx.close();
      } catch {
        /* contexto ya cerrado */
      }
      this.ctx = null;
    }
    this.noise = null;
  }
}
