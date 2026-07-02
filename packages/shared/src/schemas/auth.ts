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

/** `POST /v1/auth/login` — email + password (flujo con contraseña). */
export const loginSchema = z.object({
  email,
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof loginSchema>;

/** `POST /v1/auth/verify-email` — email + código OTP de 6 dígitos (code-input de 6 celdas). */
export const verifyEmailSchema = z.object({
  email,
  token: z.string().trim().min(1),
});
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;

/** `POST /v1/auth/resend-verification` — reenvía el código a un email. */
export const resendVerificationSchema = z.object({ email });
export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>;

/** `POST /v1/auth/forgot-password` — pide el código de recuperación. Responde 204 SIEMPRE (sin oráculo). */
export const forgotPasswordSchema = z.object({ email });
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

/** `POST /v1/auth/reset-password` — canjea el OTP de recuperación por una contraseña nueva (auto-login). */
export const resetPasswordSchema = z.object({
  email,
  token: z.string().trim().min(1),
  newPassword: password,
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

/** Canje de invitación (placeholder de S1.3/S1.4): solo el código. */
export const redeemInvitationSchema = z.object({
  code: z.string().trim().min(1),
});
export type RedeemInvitationInput = z.infer<typeof redeemInvitationSchema>;
