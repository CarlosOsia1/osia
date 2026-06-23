/** URLs del world-server para el cliente (con defaults de dev). */
export const netConfig = {
  apiUrl: process.env.NEXT_PUBLIC_WORLD_API_URL ?? 'http://localhost:2567',
  wsUrl: process.env.NEXT_PUBLIC_WORLD_WS_URL ?? 'ws://localhost:2567/world',
};

/** Render-delay de interpolación de remotas (ms): se renderiza el pasado reciente para
 *  suavizar entre snapshots. Compartido por RemotePlayers (avatares) y VoiceDriver (audio
 *  espacial) → deben usar el MISMO delay o se desincronizan boca/cuerpo. */
export const INTERP_DELAY_MS = 100;
