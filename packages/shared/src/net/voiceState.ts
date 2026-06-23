/**
 * Flags de estado de voz (mensaje VOICE_STATE) — compartidos cliente↔servidor.
 * Un solo byte: MIC abierto, hablando (VAD/AnalyserNode), o ensordecido.
 */
export const VOICE_FLAG = { MIC: 1, SPEAKING: 2, DEAFENED: 4 } as const;

export function hasVoiceFlag(flags: number, f: number): boolean {
  return (flags & f) !== 0;
}

export function withVoiceFlag(flags: number, f: number, on: boolean): number {
  return on ? flags | f : flags & ~f;
}

/**
 * Tipo de mensaje de signaling de voz (VOICE_SIGNAL): conjunto cerrado del protocolo,
 * igual que VOICE_FLAG. Reemplaza el `number` con semántica solo-en-comentario y el
 * literal mágico `kind > 3` del server.
 */
export const VOICE_SIGNAL_KIND = { OFFER: 0, ANSWER: 1, ICE: 2, ICE_END: 3 } as const;
export type VoiceSignalKind = (typeof VOICE_SIGNAL_KIND)[keyof typeof VOICE_SIGNAL_KIND];

export function isVoiceSignalKind(k: number): k is VoiceSignalKind {
  return k === 0 || k === 1 || k === 2 || k === 3;
}
