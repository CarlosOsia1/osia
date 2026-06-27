import { z } from 'zod';
import { DEV_WORLD_TICKET_SECRET, WORLD_TICKET_MIN_SECRET_LEN, parseCsvList } from '@osia/shared';

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
  // Reservado: hoy el AuthGuard valida por JWKS asimétrico (no por el secreto HS). Opcional para no
  // exigir un secreto que el código no consume (menor superficie de secretos).
  SUPABASE_JWT_SECRET: z.string().min(1).optional(),
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
  // URL base del frontend (apps/web, el Vestíbulo) para armar links de email: el de borrado apunta
  // a APP_BASE_URL/cuenta/borrar?token=... En dev, apps/web corre en :3001.
  APP_BASE_URL: z.string().min(1).default('http://localhost:3001'),
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
  // Seguridad (§8): apps/api EMITE los world tickets (HS256). En PRODUCCIÓN el secreto no puede ser
  // el default público ni uno débil → fail-closed por sí mismo (defensa en profundidad), igual que
  // el world-server (consumidor) ya hace en su config.
  if (
    data.NODE_ENV === 'production' &&
    (data.WORLD_TICKET_SECRET === DEV_WORLD_TICKET_SECRET ||
      data.WORLD_TICKET_SECRET.length < WORLD_TICKET_MIN_SECRET_LEN)
  ) {
    throw new Error(
      `WORLD_TICKET_SECRET ausente, default inseguro o demasiado corto (<${WORLD_TICKET_MIN_SECRET_LEN} chars) en producción — configura uno robusto.`,
    );
  }
  return {
    ...data,
    isProd: data.NODE_ENV === 'production',
    corsOrigins: parseCsvList(data.CORS_ORIGINS),
  };
}
