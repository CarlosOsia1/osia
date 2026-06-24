/** Configuración del world-server desde el entorno (con defaults de dev). */

import { DEV_WORLD_TICKET_SECRET, WORLD_TICKET_MIN_SECRET_LEN } from '@osia/shared';

function envList(name: string, fallback: string): string[] {
  return (process.env[name] ?? fallback)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

const port = Number(process.env.WORLD_SERVER_PORT ?? 2567);

export const config = {
  port,
  ticketSecret: process.env.WORLD_TICKET_SECRET ?? DEV_WORLD_TICKET_SECRET,
  corsOrigins: envList('WORLD_CORS_ORIGINS', 'http://localhost:3000'),
  biome: process.env.WORLD_BIOME ?? 'bosque-celeste', // bioma FIJO del mundo compartido
  worldSeed: Number(process.env.WORLD_SEED ?? 1337) || 1337, // semilla del clima determinista (mulberry32)
  isProd: process.env.NODE_ENV === 'production',
  // URL pública del WS que se devuelve al cliente. En prod: wss://ws.tu-dominio/world
  publicWsUrl: process.env.WORLD_PUBLIC_WS_URL ?? `ws://localhost:${port}/world`,
} as const;

// Seguridad (§8): en PRODUCCIÓN el secret no puede ser el default NI uno débil. Un HS256
// con secret corto/baja entropía se fuerza por fuerza bruta → suplantación de tickets.
if (
  config.isProd &&
  (config.ticketSecret === DEV_WORLD_TICKET_SECRET ||
    config.ticketSecret.length < WORLD_TICKET_MIN_SECRET_LEN)
) {
  throw new Error(
    `WORLD_TICKET_SECRET ausente, default inseguro, o demasiado corto (<${WORLD_TICKET_MIN_SECRET_LEN} chars) en producción — configurá uno robusto.`,
  );
}
