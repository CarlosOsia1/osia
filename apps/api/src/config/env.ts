import { z } from 'zod';
import { DEV_WORLD_TICKET_SECRET, parseCsvList } from '@osia/shared';

/**
 * Esquema del entorno de apps/api, validado por Zod en el arranque: si falta o está mal una var,
 * el proceso NO levanta y dice exactamente qué. Secretos solo server-side (docs/09).
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_JWT_SECRET: z.string().min(1),
  // Conexión directa Postgres (session pooler) para los repos de identity/world (no PostgREST).
  SUPABASE_DB_URL: z.string().min(1),
  // Allowlist CORS (coma-separado); nunca '*' (docs/09 §CORS).
  CORS_ORIGINS: z.string().default('http://localhost:3000,http://localhost:3001'),
  // Cookie de refresh del SSO. En prod: Domain=.osia.com + Secure. En dev local: host-only.
  COOKIE_DOMAIN: z.string().optional(),
  COOKIE_SECURE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  // World ticket (HS256) compartido con el world-server: DEBE coincidir con su WORLD_TICKET_SECRET.
  WORLD_TICKET_SECRET: z.string().min(1).default(DEV_WORLD_TICKET_SECRET),
  // URL pública del WS que se devuelve al cliente al emitir el ticket.
  WORLD_WS_URL: z.string().min(1).default('ws://localhost:2567/world'),
  // URL base del frontend para armar links de email (p. ej. el de borrado de cuenta).
  APP_BASE_URL: z.string().min(1).default('http://localhost:3000'),
  // Email SMTP (opcional): si NO está configurado, el adaptador cae a "loguear el link" (dev).
  // Cuando lo configures (proveedor con presupuesto), los emails salen de verdad.
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().min(1).default('OSIA <noreply@codfysas.com>'),
});

export type Env = z.infer<typeof envSchema> & {
  readonly isProd: boolean;
  readonly corsOrigins: readonly string[];
};

/** Parsea y valida process.env. Lanza con mensaje claro si la config es inválida. */
export function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Config de entorno inválida — ${issues}`);
  }
  const data = parsed.data;
  return {
    ...data,
    isProd: data.NODE_ENV === 'production',
    corsOrigins: parseCsvList(data.CORS_ORIGINS),
  };
}
