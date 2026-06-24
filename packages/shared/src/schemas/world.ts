import { z } from 'zod';

/** `POST /v1/world/tickets` — pedir un world ticket para entrar al Mundo (docs/10 §2.1). */
export const worldTicketSchema = z.object({
  worldId: z.string().min(1).default('osia'),
  desiredRoom: z.string().optional(),
  desiredInstance: z.string().optional(),
});
export type WorldTicketInput = z.infer<typeof worldTicketSchema>;
