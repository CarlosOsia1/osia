/** Configuración del world-server desde el entorno (con defaults de dev). */

import { DEV_WORLD_TICKET_SECRET, WORLD_TICKET_MIN_SECRET_LEN, parseCsvList } from '@osia/shared';

const envList = (name: string, fallback: string): string[] =>
  parseCsvList(process.env[name] ?? fallback);

const port = Number(process.env.WORLD_SERVER_PORT ?? 2567);
const isProd = process.env.NODE_ENV === 'production';

/**
 * Emisión ANÓNIMA de tickets (`POST /world/tickets`): remanente de F0 para probar el mundo local
 * sin SSO. En prod los tickets los emite `apps/api` autenticado; dejar el endpoint anónimo vivo
 * permitiría entrar/suplantar un handle sin cuenta. Por eso: dev = permitido, prod = PROHIBIDO
 * (y encenderlo explícito en prod es error fatal, ver guard abajo).
 */
const allowAnonEnv = process.env.WORLD_ALLOW_ANON_TICKETS;
const allowAnonTickets = allowAnonEnv === 'true' ? true : allowAnonEnv === 'false' ? false : !isProd;

export const config = {
  port,
  ticketSecret: process.env.WORLD_TICKET_SECRET ?? DEV_WORLD_TICKET_SECRET,
  corsOrigins: envList('WORLD_CORS_ORIGINS', 'http://localhost:3000'),
  biome: process.env.WORLD_BIOME ?? 'bosque-celeste', // bioma FIJO del mundo compartido
  worldSeed: Number(process.env.WORLD_SEED ?? 1337) || 1337, // semilla del clima determinista (mulberry32)
  isProd,
  allowAnonTickets,
  // URL pública del WS que se devuelve al cliente. En prod: wss://ws.tu-dominio/world
  publicWsUrl: process.env.WORLD_PUBLIC_WS_URL ?? `ws://localhost:${port}/world`,
  // Presencia durable (S1.8-H2b): si está ausente, el world-server corre SIN DB (NullPresenceStore).
  databaseUrl: process.env.DATABASE_URL,
} as const;

// Seguridad (§8): en PRODUCCIÓN el secret no puede ser el default NI uno débil. Un HS256
// con secret corto/baja entropía se fuerza por fuerza bruta → suplantación de tickets.
if (
  config.isProd &&
  (config.ticketSecret === DEV_WORLD_TICKET_SECRET ||
    config.ticketSecret.length < WORLD_TICKET_MIN_SECRET_LEN)
) {
  throw new Error(
    `WORLD_TICKET_SECRET ausente, default inseguro, o demasiado corto (<${WORLD_TICKET_MIN_SECRET_LEN} chars) en producción — configura uno robusto.`,
  );
}

// Seguridad: encender la emisión anónima de tickets en producción es un fallo fatal, no una
// opción. El endpoint anónimo dejaría entrar al mundo (y suplantar cualquier handle) sin cuenta;
// en prod los tickets los emite apps/api autenticado. Fallar ruidoso evita el pie de bala.
if (config.isProd && allowAnonEnv === 'true') {
  throw new Error(
    'WORLD_ALLOW_ANON_TICKETS=true en producción: prohibido. Los tickets del mundo los emite apps/api autenticado; el endpoint anónimo permitiría entrada/suplantación sin cuenta.',
  );
}
