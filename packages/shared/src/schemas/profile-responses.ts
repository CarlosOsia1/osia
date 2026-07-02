/**
 * Esquema Zod de RESPUESTA de la vista pública acotada de un perfil (`ProfileBrief`).
 *
 * Pieza de la reconstrucción (Ola 3, R1): las respuestas del API se validan en runtime en el
 * cliente — un contrato que diverge explota en dev como `ApiContractError` en vez de mentir en
 * pantalla (así se habría detectado el bug del perfil de la Ola 0 y el de presencia de R1).
 *
 * Regla "tolerant reader": los objetos de RESPUESTA no son `.strict()` — un campo NUEVO del
 * servidor no rompe a un cliente desplegado antes; un campo faltante o mal tipado sí falla,
 * porque eso ya es corrupción del contrato. (Los INPUT siguen `.strict()`: seguridad server-side.)
 *
 * El tipo `ProfileBrief` se deriva con `z.infer` — una sola fuente de verdad, igual que los
 * inputs de `schemas/social.ts`; `rest/dto/profile.ts` lo re-exporta para no mover import sites.
 */

import { z } from 'zod';
import { asProfileId } from '../domain/ids';

/** Vista pública acotada de un perfil (autor de post, seguidor, reactor…). */
export const profileBriefSchema = z.object({
  profileId: z.string().uuid().transform(asProfileId),
  handle: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().nullable(),
  accentColor: z.string(),
  popularityPoints: z.number(),
});

export type ProfileBrief = z.infer<typeof profileBriefSchema>;
