import { z } from 'zod';

/**
 * `DELETE /v1/accounts/me` (S2-C2) — borrado de cuenta con confirmación por CONTRASEÑA, para que
 * no se borre por accidente ni con una sesión robada (re-autenticación explícita).
 */
export const deleteAccountSchema = z.object({
  password: z.string().min(1),
});
export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;

/**
 * `POST /v1/accounts/deletion/confirm` (S2-C2) — confirma el borrado por el LINK enviado al email
 * (alternativa al borrado por contraseña). El `token` del link ES la prueba de identidad (un solo
 * uso, 24 h), así que este endpoint NO requiere sesión.
 */
export const confirmAccountDeletionSchema = z.object({
  token: z.string().min(1),
});
export type ConfirmAccountDeletionInput = z.infer<typeof confirmAccountDeletionSchema>;
