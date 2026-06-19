/** URLs del world-server para el cliente (con defaults de dev). */
export const netConfig = {
  apiUrl: process.env.NEXT_PUBLIC_WORLD_API_URL ?? 'http://localhost:2567',
  wsUrl: process.env.NEXT_PUBLIC_WORLD_WS_URL ?? 'ws://localhost:2567/world',
};
