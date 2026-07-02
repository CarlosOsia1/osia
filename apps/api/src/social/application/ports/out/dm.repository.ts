import type { ConversationDto, Cursor, MessageDto, Page } from '@osia/shared';

export const DM_REPOSITORY = Symbol('DM_REPOSITORY');

export interface DmRepository {
  /**
   * Abre (o recupera, idempotente por par canónico) la conversación con `otherAccountId`.
   * `null` si el destino no existe o el par está BLOQUEADO en cualquier dirección (→ 403/404
   * decide el caso de uso consultando `targetExists`).
   */
  getOrCreateConversation(viewerAccountId: string, otherAccountId: string): Promise<ConversationDto | null>;

  /** Bandeja del lector (keyset por actividad) + total de no-leídos (badge del nav). */
  listConversations(
    viewerAccountId: string,
    limit: number,
    cursor: Cursor | null,
  ): Promise<{ page: Page<ConversationDto>; unreadTotal: number }>;

  /** Hilo (keyset, recientes primero). `null` si la conversación no es del lector (→ 404). */
  listMessages(
    conversationId: string,
    viewerAccountId: string,
    limit: number,
    cursor: Cursor | null,
  ): Promise<Page<MessageDto> | null>;

  /**
   * Envía un mensaje SOLO si la conversación es del lector y el par NO está bloqueado (atómico);
   * bumpea la actividad y deja al remitente leído. `null` si no procede (→ 404/403 sin oráculo).
   */
  sendMessage(conversationId: string, viewerAccountId: string, body: string): Promise<MessageDto | null>;

  /** Marca la conversación como leída para el lector (idempotente). `false` si no es suya. */
  markRead(conversationId: string, viewerAccountId: string): Promise<boolean>;

  /** Retira («mensaje retirado») un mensaje PROPIO (soft-delete). `false` si no existe o no es suyo. */
  deleteOwnMessage(messageId: string, viewerAccountId: string): Promise<boolean>;
}
