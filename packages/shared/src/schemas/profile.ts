import { z } from 'zod';
import { ACCENT_PALETTE } from '../domain/enums';

/** `PATCH /v1/profiles/me` — edición parcial del perfil (docs/10 §2.2). */
export const updateProfileSchema = z
  .object({
    displayName: z.string().trim().min(1).max(40).optional(),
    bio: z.string().trim().max(280).optional(),
    // accent solo dentro de la paleta de marca (no color libre, S1.6-H1).
    accentColor: z.enum(ACCENT_PALETTE).optional(),
  })
  .strict();
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
