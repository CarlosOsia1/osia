/**
 * SpatialGraph (S0.6) — dueño del ÚNICO AudioContext y de todo el grafo Web Audio.
 *
 * Mic:    micSource → [AnalyserNode (VAD, siempre vivo)] + micGate(Gain) → micDest
 *         (el track ENVIADO sale de micDest; así el VAD nunca se auto-bloquea por
 *          micTrack.enabled=false — el gate es por ganancia, no por el track).
 * Remoto: source(stream) → BiquadFilter(lowpass por distancia) → Gain(volumen/mute)
 *         → Panner(HRTF) → master(Gain, deafen) → destination.
 *         + un <audio> oculto MUTED con el mismo stream: sumidero OBLIGATORIO o Chrome
 *           silencia el MediaStreamAudioSourceNode remoto (Chromium 121673/687574).
 *
 * Todo cambio espacial se aplica con setTargetAtTime (sin zipper); jamás .value directo.
 */

type PeerAudio = {
  el: HTMLMediaElement;
  source: MediaStreamAudioSourceNode | null;
  biquad: BiquadFilterNode;
  gain: GainNode;
  panner: PannerNode;
  retry: (() => void) | null; // reintento de play() del sumidero al volver la visibilidad
};

const MAX_DIST = 45; // m: a partir de acá, inaudible
const SMOOTH = 0.02; // constante de tiempo del suavizado

class SpatialGraph {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private peers = new Map<number, PeerAudio>();

  private micRaw: MediaStream | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;
  private micAnalyser: AnalyserNode | null = null;
  private micGate: GainNode | null = null;
  private micDest: MediaStreamAudioDestinationNode | null = null;
  private buf: Float32Array<ArrayBuffer> | null = null;

  get ready(): boolean {
    return !!this.ctx;
  }

  /** Crea/reanuda el AudioContext. DEBE llamarse dentro de un gesto del usuario. */
  ensureContext(): AudioContext {
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
      // iOS/cambio de pestaña: si el contexto se suspende/interrumpe, reanudar al volver.
      this.ctx.onstatechange = () => {
        if (this.ctx && this.ctx.state !== 'running') void this.ctx.resume().catch(() => {});
      };
      // Red de seguridad: si el contexto se creó suspendido (un peer entró antes de que el
      // usuario activara la voz), reanudarlo en el primer gesto del usuario en esta pestaña.
      const resume = () => void this.ctx?.resume().catch(() => {});
      window.addEventListener('pointerdown', resume);
      window.addEventListener('keydown', resume);
    }
    void this.ctx.resume().catch(() => {});
    return this.ctx;
  }

  /** Estado del AudioContext (diagnóstico): 'running' | 'suspended' | 'none'. */
  state(): string {
    return this.ctx?.state ?? 'none';
  }

  // ---------- Micrófono ----------
  /** Procesa el mic y devuelve el track a ENVIAR (gateado por ganancia). */
  startMic(raw: MediaStream): MediaStreamTrack | null {
    this.stopMic(); // idempotencia: libera cualquier mic/nodos previos (track.stop + disconnect)
    const ctx = this.ensureContext();
    this.micRaw = raw;
    this.micSource = ctx.createMediaStreamSource(raw);
    this.micAnalyser = ctx.createAnalyser();
    this.micAnalyser.fftSize = 512;
    this.buf = new Float32Array(this.micAnalyser.fftSize);
    this.micGate = ctx.createGain();
    this.micGate.gain.value = 0; // arranca cerrado (muted) hasta VAD/PTT
    this.micDest = ctx.createMediaStreamDestination();
    this.micSource.connect(this.micAnalyser); // tap siempre vivo
    this.micSource.connect(this.micGate);
    this.micGate.connect(this.micDest);
    return this.micDest.stream.getAudioTracks()[0] ?? null;
  }

  setMicGate(open: boolean): void {
    if (this.ctx && this.micGate) this.micGate.gain.setTargetAtTime(open ? 1 : 0, this.ctx.currentTime, SMOOTH);
  }

  /** Nivel RMS del mic [0..1] (para VAD + indicador propio de "hablando"). */
  micLevel(): number {
    if (!this.micAnalyser || !this.buf) return 0;
    this.micAnalyser.getFloatTimeDomainData(this.buf);
    let sum = 0;
    for (let i = 0; i < this.buf.length; i++) sum += this.buf[i]! * this.buf[i]!;
    return Math.sqrt(sum / this.buf.length);
  }

  stopMic(): void {
    this.micRaw?.getTracks().forEach((t) => t.stop()); // libera el mic del SO (apaga el indicador)
    this.micSource?.disconnect();
    this.micAnalyser?.disconnect();
    this.micGate?.disconnect();
    this.micDest?.disconnect();
    this.micRaw = this.micSource = this.micAnalyser = this.micGate = this.micDest = null;
    this.buf = null;
  }

  // ---------- Pares remotos ----------
  addPeer(id: number): void {
    const ctx = this.ensureContext();
    if (this.peers.has(id) || !this.master) return;
    // <video muted playsinline> como sumidero: más fiable que <audio> con MediaStream remoto en
    // Safari/iOS (vale igual para un stream solo-audio). El audio audible sale por Web Audio.
    const el = document.createElement('video');
    el.autoplay = true;
    el.muted = true;
    el.setAttribute('playsinline', '');
    el.style.display = 'none';
    document.body.appendChild(el);
    const biquad = ctx.createBiquadFilter();
    biquad.type = 'lowpass';
    biquad.frequency.value = 22000;
    const gain = ctx.createGain();
    const panner = ctx.createPanner();
    panner.panningModel = 'HRTF';
    panner.distanceModel = 'inverse';
    panner.refDistance = 6; // audible de cerca y a media distancia (el oyente es la cámara, ~10u)
    panner.rolloffFactor = 1; // caída suave (antes 2.5 = casi inaudible a 10u)
    panner.maxDistance = MAX_DIST;
    panner.positionX.value = 9999; // lejos hasta tener la posición real (se corrige al 1er update)
    biquad.connect(gain);
    gain.connect(panner);
    panner.connect(this.master);
    this.peers.set(id, { el, source: null, biquad, gain, panner, retry: null });
  }

  setPeerStream(id: number, stream: MediaStream): void {
    const ctx = this.ensureContext();
    const p = this.peers.get(id);
    if (!p) return;
    p.el.srcObject = stream; // sumidero obligatorio (Chrome silencia el source remoto si falta)
    void p.el.play().catch((e: unknown) => console.warn('[voice] sink play() rechazado', id, e));
    if (!p.retry) {
      // iOS/cambio de pestaña: si el sumidero se pausó, reintentar al volver a estar visible.
      p.retry = () => {
        if (document.visibilityState === 'visible') void p.el.play().catch(() => {});
      };
      document.addEventListener('visibilitychange', p.retry);
    }
    p.source?.disconnect();
    p.source = ctx.createMediaStreamSource(stream);
    p.source.connect(p.biquad);
  }

  setPeerPosition(id: number, x: number, y: number, z: number, dist: number): void {
    const p = this.peers.get(id);
    if (!p || !this.ctx) return;
    const t = this.ctx.currentTime;
    p.panner.positionX.setTargetAtTime(x, t, SMOOTH);
    p.panner.positionY.setTargetAtTime(y, t, SMOOTH);
    p.panner.positionZ.setTargetAtTime(z, t, SMOOTH);
    const k = Math.max(0, Math.min(1, dist / MAX_DIST)); // lejos = más apagado
    p.biquad.frequency.setTargetAtTime(22000 - k * (22000 - 700), t, 0.05);
  }

  setListener(
    px: number, py: number, pz: number,
    fx: number, fy: number, fz: number,
    ux: number, uy: number, uz: number,
  ): void {
    if (!this.ctx) return;
    const l = this.ctx.listener;
    const t = this.ctx.currentTime;
    if (l.positionX) {
      l.positionX.setTargetAtTime(px, t, SMOOTH);
      l.positionY.setTargetAtTime(py, t, SMOOTH);
      l.positionZ.setTargetAtTime(pz, t, SMOOTH);
      l.forwardX.setTargetAtTime(fx, t, SMOOTH);
      l.forwardY.setTargetAtTime(fy, t, SMOOTH);
      l.forwardZ.setTargetAtTime(fz, t, SMOOTH);
      l.upX.setTargetAtTime(ux, t, SMOOTH);
      l.upY.setTargetAtTime(uy, t, SMOOTH);
      l.upZ.setTargetAtTime(uz, t, SMOOTH);
    } else {
      const legacy = l as unknown as {
        setPosition?: (x: number, y: number, z: number) => void;
        setOrientation?: (fx: number, fy: number, fz: number, ux: number, uy: number, uz: number) => void;
      };
      legacy.setPosition?.(px, py, pz);
      legacy.setOrientation?.(fx, fy, fz, ux, uy, uz);
    }
  }

  setPeerGain(id: number, v: number): void {
    const p = this.peers.get(id);
    if (p && this.ctx) p.gain.gain.setTargetAtTime(v, this.ctx.currentTime, SMOOTH);
  }

  setDeafened(b: boolean): void {
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(b ? 0 : 1, this.ctx.currentTime, SMOOTH);
  }

  removePeer(id: number): void {
    const p = this.peers.get(id);
    if (!p) return;
    p.source?.disconnect();
    p.biquad.disconnect();
    p.gain.disconnect();
    p.panner.disconnect();
    if (p.retry) document.removeEventListener('visibilitychange', p.retry);
    p.el.srcObject = null;
    p.el.remove();
    this.peers.delete(id);
  }

  teardown(): void {
    for (const id of [...this.peers.keys()]) this.removePeer(id);
    this.stopMic();
    // El AudioContext se conserva (reusable); cerrarlo requeriría otro gesto para recrearlo.
  }
}

export const spatialGraph = new SpatialGraph();
