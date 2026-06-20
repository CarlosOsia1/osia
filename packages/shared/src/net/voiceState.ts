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
