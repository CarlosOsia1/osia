import { z } from 'zod';

/**
 * `DELETE /v1/accounts/me` (S2-C2) — borrado de cuenta con confirmación por CONTRASEÑA, para que
 * no se borre por accidente ni con una sesión robada (re-autenticación explícita).
 */
export const deleteAccountSchema = z.object({
  password: z.string().min(1),
});
export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;
