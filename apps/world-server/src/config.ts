/** Configuración del world-server desde el entorno (con defaults de dev). */

function envList(name: string, fallback: string): string[] {
  return (process.env[name] ?? fallback)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export const config = {
  port: Number(process.env.WORLD_SERVER_PORT ?? 2567),
  ticketSecret: process.env.WORLD_TICKET_SECRET ?? 'osia-dev-ticket-secret-change-me',
  corsOrigins: envList('WORLD_CORS_ORIGINS', 'http://localhost:3000'),
  biome: process.env.WORLD_BIOME ?? 'bosque-celeste', // bioma FIJO del mundo compartido
  isProd: process.env.NODE_ENV === 'production',
} as const;
