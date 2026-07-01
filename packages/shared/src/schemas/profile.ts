import { z } from 'zod';
import { ACCENT_PALETTE } from '../domain/enums';
import { PROFILE_BIO_MAX } from '../rest/dto/profile';

/** Parche de preferencias (S1.6-H3): todo opcional, se mezcla sobre las prefs guardadas. */
export const updatePrefsSchema = z
  .object({
    sound: z.boolean().optional(),
    volume: z.number().min(0).max(1).optional(),
    reducedMotion: z.enum(['system', 'reduce', 'allow']).optional(),
    micOptIn: z.boolean().optional(),
  })
  .strict();
export type UpdatePrefsInput = z.infer<typeof updatePrefsSchema>;

/** `PATCH /v1/profiles/me` — edición parcial del perfil (docs/10 §2.2). */
export const updateProfileSchema = z
  .object({
    displayName: z.string().trim().min(1).max(40).optional(),
    bio: z.string().trim().max(PROFILE_BIO_MAX).optional(),
    // accent solo dentro de la paleta de marca (no color libre, S1.6-H1).
    accentColor: z.enum(ACCENT_PALETTE).optional(),
    prefs: updatePrefsSchema.optional(),
  })
  .strict();
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
