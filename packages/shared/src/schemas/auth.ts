/**
 * Esquemas Zod de auth (docs/10 §2.1, §5.3). Un esquema → tipo (`z.infer`) + validador:
 * `apps/api` valida el body en el borde (422 con `details`) y el cliente valida el formulario
 * antes de enviar (fail-fast). Un solo esquema, dos usos — sin duplicar.
 *
 * Los límites reutilizan los patterns de `domain/enums` para que schema y CHECK del ER no diverjan.
 */

import { z } from 'zod';
import { HANDLE_PATTERN } from '../domain/enums';

const email = z.string().trim().toLowerCase().email();
const handle = z
  .string()
  .trim()
  .regex(HANDLE_PATTERN, 'handle: 3-20 minúsculas, números o guion bajo');
const displayName = z.string().trim().min(1).max(40);
const password = z.string().min(8).max(200);

/** `POST /v1/auth/signup` — requiere `code` de invitación válido (gate invite-only, §2.1). */
export const signupSchema = z.object({
  code: z.string().trim().min(1),
  email,
  handle,
  displayName,
  // password opcional: el flujo por defecto es magic-link/OTP de Supabase (sin contraseña).
  password: password.optional(),
});
export type SignupInput = z.infer<typeof signupSchema>;

/** `POST /v1/auth/verify-email` — el `token` puede ser el código de 6 celdas o un token de link. */
export const verifyEmailSchema = z.object({
  token: z.string().trim().min(1),
});
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;

/** Canje de invitación (placeholder de S1.3/S1.4): solo el código. */
export const redeemInvitationSchema = z.object({
  code: z.string().trim().min(1),
});
export type RedeemInvitationInput = z.infer<typeof redeemInvitationSchema>;
