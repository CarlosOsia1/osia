/** Configuración del world-server desde el entorno (con defaults de dev). */

function envList(name: string, fallback: string): string[] {
  return (process.env[name] ?? fallback)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

const DEV_TICKET_SECRET = 'osia-dev-ticket-secret-change-me';

export const config = {
  port: Number(process.env.WORLD_SERVER_PORT ?? 2567),
  ticketSecret: process.env.WORLD_TICKET_SECRET ?? DEV_TICKET_SECRET,
  corsOrigins: envList('WORLD_CORS_ORIGINS', 'http://localhost:3000'),
  biome: process.env.WORLD_BIOME ?? 'bosque-celeste', // bioma FIJO del mundo compartido
  isProd: process.env.NODE_ENV === 'production',
} as const;

// Seguridad: en PRODUCCIÓN no arrancar con el secret de dev (suplantación de tickets trivial).
if (config.isProd && config.ticketSecret === DEV_TICKET_SECRET) {
  throw new Error('WORLD_TICKET_SECRET es el default inseguro en producción — configurá uno propio.');
}
