/**
 * AmbientEngine — disciplina de NO-FUGA de WebAudio (§7 de CLAUDE.md). La GC del navegador NO libera
 * audio: hay que detener fuentes y cerrar el AudioContext explícitamente. Como en CI no hay WebAudio,
 * mockeamos un AudioContext falso que CUENTA nodos creados, fuentes corriendo y cierres → verificamos
 * que tras dispose() no queda nada vivo, incluso bajo estrés (entrar/salir 20×).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { AmbientEngine } from './AmbientEngine';

// — AudioContext falso (cuenta recursos; sin navegador) —————————————————————————————————————
class FakeParam {
  value = 0;
  setTargetAtTime(): void {
    /* crossfade no-op en el mock */
  }
}

class FakeNode {
  connected = true;
  constructor(protected readonly ctx: FakeAudioContext) {
    ctx.created.push(this);
  }
  connect(): this {
    return this;
  }
  disconnect(): void {
    this.connected = false;
  }
}

class FakeGain extends FakeNode {
  readonly gain = new FakeParam();
}

class FakeFilter extends FakeNode {
  type = 'lowpass';
  readonly frequency = new FakeParam();
  readonly Q = new FakeParam();
}

class FakeSource extends FakeNode {
  started = false;
  stopped = false;
  loop = false;
  buffer: unknown = null;
  onended: (() => void) | null = null;
  start(): void {
    this.started = true;
    this.ctx.running.add(this);
  }
  stop(): void {
    this.stopped = true;
    this.ctx.running.delete(this);
  }
}

class FakeOscillator extends FakeSource {
  type = 'square';
  readonly frequency = new FakeParam();
}

class FakeBuffer {
  private readonly data: Float32Array;
  constructor(_channels: number, public readonly length: number, public readonly sampleRate: number) {
    this.data = new Float32Array(length);
  }
  getChannelData(): Float32Array {
    return this.data;
  }
}

class FakeAudioContext {
  static instances: FakeAudioContext[] = [];
  state: 'running' | 'suspended' | 'closed' = 'running';
  currentTime = 0;
  sampleRate = 44100;
  readonly destination = {};
  readonly created: FakeNode[] = [];
  readonly running = new Set<FakeSource>();
  closed = false;

  constructor() {
    FakeAudioContext.instances.push(this);
  }
  createGain(): FakeGain {
    return new FakeGain(this);
  }
  createBufferSource(): FakeSource {
    return new FakeSource(this);
  }
  createBiquadFilter(): FakeFilter {
    return new FakeFilter(this);
  }
  createOscillator(): FakeOscillator {
    return new FakeOscillator(this);
  }
  createBuffer(channels: number, length: number, sampleRate: number): FakeBuffer {
    return new FakeBuffer(channels, length, sampleRate);
  }
  async decodeAudioData(): Promise<FakeBuffer> {
    return new FakeBuffer(1, 4410, this.sampleRate);
  }
  async resume(): Promise<void> {
    this.state = 'running';
  }
  async close(): Promise<void> {
    this.closed = true;
    this.state = 'closed';
  }
}

// Instala los globales que toca el motor ANTES de importarlo (sin navegador ni red).
const g = globalThis as unknown as { AudioContext: unknown; fetch: unknown };
g.AudioContext = FakeAudioContext;
// Sin red: que el fetch de assets falle → cada capa cae a sintetizada (el motor lo tolera).
g.fetch = async (): Promise<never> => {
  throw new Error('sin red en el test');
};

test('start() abre el contexto y arranca fuentes; dispose() lo libera TODO (cero fugas)', async () => {
  FakeAudioContext.instances.length = 0;
  const engine = new AmbientEngine();
  await engine.start('verano');

  const ctx = FakeAudioContext.instances.at(-1)!;
  assert.ok(ctx.created.length > 0, 'creó nodos de audio');
  assert.ok(ctx.running.size > 0, 'hay fuentes/loops corriendo');
  assert.equal(ctx.closed, false, 'el contexto está abierto');

  await engine.dispose();
  assert.equal(ctx.running.size, 0, 'tras dispose no quedan fuentes corriendo');
  assert.equal(ctx.closed, true, 'tras dispose el contexto está cerrado');
  assert.ok(
    ctx.created.every((n) => !n.connected),
    'tras dispose TODOS los nodos quedan desconectados',
  );
  assert.equal(engine.isRunning(), false, 'el motor ya no corre');
});

test('entrar/salir 20× no acumula contextos ni fuentes (sin fuga de audio, §7)', async () => {
  FakeAudioContext.instances.length = 0;
  for (let i = 0; i < 20; i++) {
    const engine = new AmbientEngine();
    await engine.start('invierno');
    await engine.dispose();
  }
  assert.equal(FakeAudioContext.instances.length, 20, 'un contexto por ciclo (no se reusa uno fugado)');
  for (const ctx of FakeAudioContext.instances) {
    assert.equal(ctx.closed, true, 'cada contexto quedó cerrado');
    assert.equal(ctx.running.size, 0, 'cada contexto quedó sin fuentes corriendo');
  }
});
