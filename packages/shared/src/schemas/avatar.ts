import { z } from 'zod';

/**
 * Estilos de avatar low-poly (opciones discretas, S1.6-H2 MVP — sin editor 3D pesado, el backlog
 * lo marca como pozo de tiempo). El render real low-poly llega en S1.8 (El Mundo).
 */
export const AVATAR_STYLES = ['sereno', 'errante', 'lumen', 'umbral'] as const;
export type AvatarStyle = (typeof AVATAR_STYLES)[number];

/** `PATCH /v1/avatars/me` — config discreta del avatar activo. */
export const updateAvatarSchema = z
  .object({
    style: z.enum(AVATAR_STYLES).optional(),
  })
  .strict();
export type UpdateAvatarInput = z.infer<typeof updateAvatarSchema>;
