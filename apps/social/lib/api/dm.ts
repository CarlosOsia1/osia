import {
  conversationResponseSchema,
  conversationsPageDtoSchema,
  messageDtoSchema,
  messageResponseSchema,
  pageOf,
  type ConversationDto,
  type ConversationsPageDto,
  type MessageDto,
  type Page,
} from '@osia/shared';
import { apiCall, apiVoid, pageQs } from './client';

/** Mensajería directa (R5): bandeja + hilo. Tiempo real por polling (Realtime es Ola 4). */

/** Abre (o recupera) la conversación con una cuenta (`POST /v1/dm/conversations`). */
export async function openConversation(accountId: string): Promise<ConversationDto> {
  const { conversation } = await apiCall('/v1/dm/conversations', conversationResponseSchema, {
    method: 'POST',
    body: { accountId },
  });
  return conversation;
}

/** Bandeja (`GET /v1/dm/conversations`): página por actividad + `unreadTotal` (badge). */
export function getConversations(cursor?: string): Promise<ConversationsPageDto> {
  return apiCall(`/v1/dm/conversations${pageQs(cursor)}`, conversationsPageDtoSchema);
}

/** Hilo (`GET /v1/dm/conversations/{id}/messages`), keyset (recientes primero). */
export function getMessages(conversationId: string, cursor?: string): Promise<Page<MessageDto>> {
  return apiCall(`/v1/dm/conversations/${conversationId}/messages${pageQs(cursor)}`, pageOf(messageDtoSchema));
}

/** Envía un mensaje (`POST /v1/dm/conversations/{id}/messages`). */
export async function sendDmMessage(conversationId: string, body: string): Promise<MessageDto> {
  const { message } = await apiCall(`/v1/dm/conversations/${conversationId}/messages`, messageResponseSchema, {
    method: 'POST',
    body: { body },
  });
  return message;
}

/** Marca la conversación como leída (`POST /v1/dm/conversations/{id}/read`). */
export function markConversationRead(conversationId: string): Promise<void> {
  return apiVoid(`/v1/dm/conversations/${conversationId}/read`, { method: 'POST' });
}

/** Retira un mensaje propio (`DELETE /v1/dm/messages/{id}`) — queda «mensaje retirado». */
export function deleteDmMessage(messageId: string): Promise<void> {
  return apiVoid(`/v1/dm/messages/${messageId}`, { method: 'DELETE' });
}
