/**
 * Esquema Zod de la waitlist (docs/10 §2.1; backlog S1.4-H2). Captura email + de dónde llegó.
 * Idempotente por email del lado servidor; el `meta` queda abierto para señales de marketing.
 */

import { z } from 'zod';

export const waitlistSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  /** Cómo llegó (landing, discord, referido…). Opcional. */
  source: z.string().trim().max(60).optional(),
  /** Señales libres (utm, handle deseado…). No estructurado por contrato. */
  meta: z.record(z.unknown()).optional(),
});
export type WaitlistInput = z.infer<typeof waitlistSchema>;
