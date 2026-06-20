/**
 * MeshVoice (S0.6) — malla de voz P2P (singleton imperativo, fuera de React →
 * a prueba de StrictMode). Una RTCPeerConnection por par audible.
 *
 * Decisiones (de la investigación + veredicto adversarial):
 *  - Perfect Negotiation (MDN): polite = (selfId > peerId), simétrico, fijo por PC.
 *  - Cap de AUDIBLES top-N: en un claro chico los 12 están "cerca"; el gating por radio
 *    no reduce nada, así que limitamos a los N más cercanos (el resto sólo roster).
 *  - dropPeer DURO en leave/out-of-range; NUNCA reusar una PC a través de un cambio de id.
 *  - Ignorar signaling huérfano (de un srcId no gateado) → no resucita PCs zombi.
 *  - Trickle ICE puro; restartIce en failed; connectionState (no iceConnectionState).
 *  - Gate del mic por GANANCIA (SpatialGraph), no por micTrack.enabled (el VAD no se bloquea).
 */

import { VOICE_FLAG } from '@osia/shared';
import { getIceServers } from './iceConfig';
import { spatialGraph } from './SpatialGraph';
import type { NetClient } from '../net/NetClient';

const AUDIBLE_CAP = 6; // máximo de pares con voz P2P activa
const RADIUS_IN = 15; // abre conexión al acercarse
const RADIUS_OUT = 20; // cierra al alejarse (histéresis)
const VAD_THRESH = 0.014; // umbral RMS aproximado
const VAD_HANG_MS = 600; // hangover de release (no clipea finales de palabra)

type Peer = {
  pc: RTCPeerConnection;
  polite: boolean;
  makingOffer: boolean;
  ignoreOffer: boolean;
  settingRemoteAnswer: boolean;
  pending: RTCIceCandidateInit[];
};

class MeshVoice {
  private net: NetClient | null = null;
  private peers = new Map<number, Peer>();
  private active = new Set<number>(); // pares gateados (audibles); sólo de acá se crean PCs
  private micTrack: MediaStreamTrack | null = null;
  private micOn = false;
  private mode: 'vad' | 'ptt' = 'vad';
  private pushing = false;
  private muted = false;
  private deafened = false;
  private speaking = false;
  private lastFlags = -1;
  private vadHigh = 0;
  private vadTimer: ReturnType<typeof setInterval> | null = null;

  attach(net: NetClient): void {
    this.net = net;
    net.onVoiceSignal = (src, kind, payload) => void this.onSignal(src, kind, payload);
    net.onReset = () => this.resetPeers(); // re-WELCOME: la roster pudo cambiar de ids
  }

  detach(): void {
    if (this.net) {
      this.net.onVoiceSignal = null;
      this.net.onReset = null;
    }
    this.stopVad();
    for (const id of [...this.peers.keys()]) this.closePeer(id);
    this.active.clear();
    spatialGraph.teardown();
    this.micTrack = null;
    this.micOn = false;
    this.net = null;
  }

  isMicOn(): boolean {
    return this.micOn;
  }
  isSpeaking(): boolean {
    return this.speaking;
  }
  getMode(): 'vad' | 'ptt' {
    return this.mode;
  }

  /** Pide el micrófono (DEBE llamarse desde un gesto del usuario: priming de autoplay). */
  async enableMic(): Promise<boolean> {
    if (this.micOn) return true;
    if (typeof window === 'undefined' || !window.isSecureContext) return false;
    if (!navigator.mediaDevices?.getUserMedia) return false;
    try {
      const raw = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
      });
      spatialGraph.ensureContext();
      this.micTrack = spatialGraph.startMic(raw);
      this.micOn = true;
      for (const [, p] of this.peers) this.addMicTo(p.pc); // a las PCs ya abiertas
      this.startVad();
      this.publishState();
      return true;
    } catch {
      return false;
    }
  }

  setMode(m: 'vad' | 'ptt'): void {
    this.mode = m;
    this.applyGate(m === 'ptt' ? this.pushing : false);
  }
  setPushing(b: boolean): void {
    this.pushing = b;
    if (this.mode === 'ptt') this.applyGate(b);
  }
  setMuted(b: boolean): void {
    this.muted = b;
    if (b) this.applyGate(false);
    this.publishState();
  }
  setDeafened(b: boolean): void {
    this.deafened = b;
    spatialGraph.setDeafened(b);
    this.publishState();
  }

  private applyGate(open: boolean): void {
    const really = open && this.micOn && !this.muted;
    spatialGraph.setMicGate(really);
    if (this.speaking !== really) {
      this.speaking = really;
      this.publishState();
    }
  }

  private startVad(): void {
    this.stopVad();
    this.vadTimer = setInterval(() => {
      if (this.mode !== 'vad' || !this.micOn || this.muted) return;
      const now = performance.now();
      if (spatialGraph.micLevel() > VAD_THRESH) this.vadHigh = now;
      this.applyGate(now - this.vadHigh < VAD_HANG_MS);
    }, 100);
  }
  private stopVad(): void {
    if (this.vadTimer) clearInterval(this.vadTimer);
    this.vadTimer = null;
  }

  private publishState(): void {
    if (!this.net) return;
    let flags = 0;
    if (this.micOn && !this.muted) flags |= VOICE_FLAG.MIC;
    if (this.speaking) flags |= VOICE_FLAG.SPEAKING;
    if (this.deafened) flags |= VOICE_FLAG.DEAFENED;
    if (flags !== this.lastFlags) {
      this.lastFlags = flags;
      this.net.sendVoiceState(flags);
    }
  }

  /** Gating por proximidad + cap top-N. `ranked` = remotos ordenados por cercanía. */
  updateNeighbors(ranked: { id: number; dist: number }[]): void {
    const want = new Set<number>();
    for (const { id, dist } of ranked) {
      const already = this.active.has(id);
      const inRange = dist <= (already ? RADIUS_OUT : RADIUS_IN); // histéresis
      if (inRange && want.size < AUDIBLE_CAP) want.add(id);
    }
    for (const id of want) if (!this.active.has(id)) this.openPeer(id);
    for (const id of [...this.active]) if (!want.has(id)) this.closePeer(id);
  }

  private openPeer(id: number): void {
    if (!this.net || this.peers.has(id) || this.net.selfId === null) return;
    let pc: RTCPeerConnection;
    try {
      pc = new RTCPeerConnection({ iceServers: getIceServers() });
    } catch {
      return; // config ICE inválida → no dejar el id "pegado" en active sin PC; el próximo tick reintenta
    }
    this.active.add(id);
    spatialGraph.addPeer(id);
    const polite = this.net.selfId > id;
    const peer: Peer = { pc, polite, makingOffer: false, ignoreOffer: false, settingRemoteAnswer: false, pending: [] };
    this.peers.set(id, peer);

    pc.ontrack = (e) => {
      const stream = e.streams[0];
      if (stream) {
        spatialGraph.setPeerStream(id, stream);
        console.info('[voz] audio recibido de', id);
      }
    };
    pc.onicecandidate = (e) => {
      if (e.candidate) this.net?.sendVoiceSignal(id, 2, JSON.stringify(e.candidate));
    };
    pc.onnegotiationneeded = () => {
      void (async () => {
        try {
          peer.makingOffer = true;
          await pc.setLocalDescription();
          if (pc.localDescription) this.net?.sendVoiceSignal(id, 0, JSON.stringify(pc.localDescription));
        } catch {
          /* ignorar */
        } finally {
          peer.makingOffer = false;
        }
      })();
    };
    pc.onconnectionstatechange = () => {
      console.info('[voz] peer', id, '→', pc.connectionState);
      if (pc.connectionState === 'failed') {
        try {
          pc.restartIce();
        } catch {
          /* ignorar */
        }
      }
    };

    // m-line de audio sendrecv (existe aunque el mic aún no esté; PN dispara la oferta).
    pc.addTransceiver('audio', { direction: 'sendrecv' });
    if (this.micTrack) this.addMicTo(pc);
  }

  private addMicTo(pc: RTCPeerConnection): void {
    if (!this.micTrack) return;
    const sender = pc.getSenders().find((s) => !s.track || s.track.kind === 'audio');
    if (sender) void sender.replaceTrack(this.micTrack);
    else pc.addTrack(this.micTrack);
  }

  private closePeer(id: number): void {
    this.active.delete(id);
    const peer = this.peers.get(id);
    if (peer) {
      const pc = peer.pc;
      pc.ontrack = null;
      pc.onicecandidate = null;
      pc.onnegotiationneeded = null;
      pc.onconnectionstatechange = null;
      pc.getReceivers().forEach((r) => {
        try {
          r.track?.stop(); // libera el track remoto (evita el leak 2484); el mic NO se toca
        } catch {
          /* ignorar */
        }
      });
      try {
        pc.close();
      } catch {
        /* ignorar */
      }
      this.peers.delete(id);
    }
    spatialGraph.removePeer(id);
  }

  /** Reconexión / re-WELCOME: cerrar todas las PCs (la roster puede traer ids nuevos). */
  private resetPeers(): void {
    for (const id of [...this.peers.keys()]) this.closePeer(id);
    this.active.clear();
  }

  private async onSignal(src: number, kind: number, payload: string): Promise<void> {
    if (!this.peers.has(src)) {
      // Sin PC local todavía. Una OFERTA de un par que SIGUE en la roster y entra en el cap es
      // legítima (asimetría de gating: el remoto nos gateó antes que nosotros a él) → abrir
      // reactivamente. Answers/candidates sin peer, o ids fuera de la roster, se ignoran (huérfanos).
      const inRoster = this.net?.getRemoteIds().includes(src) ?? false;
      if (kind !== 0 || !inRoster || this.active.size >= AUDIBLE_CAP) return;
      this.openPeer(src); // PN resuelve el glare (ambos lados ofertan; el impolite ignora)
    }
    const peer = this.peers.get(src);
    if (!peer) return;
    const pc = peer.pc;
    try {
      if (kind === 0 || kind === 1) {
        const desc = JSON.parse(payload) as RTCSessionDescriptionInit;
        const readyForOffer = !peer.makingOffer && (pc.signalingState === 'stable' || peer.settingRemoteAnswer);
        const offerCollision = kind === 0 && !readyForOffer;
        peer.ignoreOffer = !peer.polite && offerCollision;
        if (peer.ignoreOffer) return;
        peer.settingRemoteAnswer = kind === 1;
        await pc.setRemoteDescription(desc); // rollback implícito del lado polite
        peer.settingRemoteAnswer = false;
        for (const c of peer.pending) {
          try {
            await pc.addIceCandidate(c);
          } catch {
            /* ignorar */
          }
        }
        peer.pending.length = 0;
        if (kind === 0) {
          await pc.setLocalDescription();
          if (pc.localDescription) this.net?.sendVoiceSignal(src, 1, JSON.stringify(pc.localDescription));
        }
      } else if (kind === 2) {
        const cand = JSON.parse(payload) as RTCIceCandidateInit;
        if (!pc.remoteDescription) {
          peer.pending.push(cand); // los ICE suelen ganarle al SDP → bufferear
        } else {
          try {
            await pc.addIceCandidate(cand);
          } catch {
            peer.pending.push(cand); // ufrag de un ICE-restart aún no aplicado → re-bufferear
          }
        }
      }
    } catch {
      /* glare/orden: tragar */
    }
  }
}

export const meshVoice = new MeshVoice();
