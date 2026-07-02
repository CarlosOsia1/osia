/**
 * Mensajería directa (R5): inputs Y respuestas, schema-first (`z.infer` como todo el contrato
 * social). La conversación es 1-a-1 (par canónico en DB); el hilo pagina keyset. El badge de
 * `/mensajes` sale de `unreadTotal` — los DM viven FUERA de la campana social (sin filas en
 * `social.notifications`: la bandeja ES su propio aviso).
 */

import { z } from 'zod';
import { asAccountId, asConversationId, asMessageId } from '../domain/ids';
import { profileBriefSchema } from './profile-responses';
import { pageOf } from './social-responses';

/** Tope del cuerpo de un mensaje (espejo del CHECK; mismo tope que un post). */
export const DM_BODY_MAX = 2000;

// --- Inputs ---

/** `POST /v1/dm/conversations` — abrir (o recuperar) la conversación con una cuenta. */
export const openConversationSchema = z
  .object({
    accountId: z.string().uuid(),
  })
  .strict();
export type OpenConversationInput = z.infer<typeof openConversationSchema>;

/** `POST /v1/dm/conversations/{id}/messages` — enviar un mensaje. */
export const sendMessageSchema = z
  .object({
    body: z.string().trim().min(1).max(DM_BODY_MAX),
  })
  .strict();
export type SendMessageInput = z.infer<typeof sendMessageSchema>;

// --- Respuestas ---

/** Un mensaje del hilo. `body: null` ⇔ retirado por su autor (la UI pinta «mensaje retirado»). */
export const messageDtoSchema = z.object({
  id: z.string().uuid().transform(asMessageId),
  conversationId: z.string().uuid().transform(asConversationId),
  senderAccountId: z.string().uuid().transform(asAccountId),
  body: z.string().nullable(),
  createdAt: z.string(),
});
export type MessageDto = z.infer<typeof messageDtoSchema>;

/** Una conversación en la bandeja: el OTRO (brief + accountId) + actividad + no-leídos. */
export const conversationDtoSchema = z.object({
  id: z.string().uuid().transform(asConversationId),
  other: profileBriefSchema.extend({ accountId: z.string().uuid().transform(asAccountId) }),
  /** Última actividad (ISO); `null` si aún no hay mensajes. */
  lastMessageAt: z.string().nullable(),
  /** Adelanto del último mensaje (`null` si no hay o fue retirado). */
  lastMessagePreview: z.string().nullable(),
  /** Mensajes del otro sin leer en ESTA conversación. */
  unreadCount: z.number(),
});
export type ConversationDto = z.infer<typeof conversationDtoSchema>;

/** Sobre de `POST /v1/dm/conversations` (abrir/recuperar). */
export const conversationResponseSchema = z.object({ conversation: conversationDtoSchema });

/** Respuesta de `GET /v1/dm/conversations`: página + total de no-leídos (badge del nav). */
export const conversationsPageDtoSchema = pageOf(conversationDtoSchema).extend({
  unreadTotal: z.number(),
});
export type ConversationsPageDto = z.infer<typeof conversationsPageDtoSchema>;

/** Sobre `{ message }` de `POST /v1/dm/conversations/{id}/messages`. */
export const messageResponseSchema = z.object({ message: messageDtoSchema });
