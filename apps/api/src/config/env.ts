import { z } from 'zod';

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
    corsOrigins: data.CORS_ORIGINS.split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  };
}
