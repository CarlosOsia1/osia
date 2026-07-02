import { Inject, Injectable } from '@nestjs/common';
import {
  clampLimit,
  decodeCursor,
  ErrorCode,
  type ConversationDto,
  type ConversationsPageDto,
  type ListQueryInput,
  type MessageDto,
  type Page,
  type SendMessageInput,
} from '@osia/shared';
import { AppException } from '../../../common/app-exception';
import { DM_REPOSITORY, type DmRepository } from '../ports/out/dm.repository';
import { FOLLOW_REPOSITORY, type FollowRepository } from '../ports/out/follow.repository';

/**
 * Mensajería directa (R5): 1-a-1, texto persistente. Cualquier miembro con email verificado
 * puede iniciar (red por invitación — se revisita si hay abuso); bloqueados NO inician ni
 * envían (403 sin oráculo, re-verificado al ENVIAR, no solo al abrir). Los DM viven fuera de
 * la campana social: la bandeja y su badge (`unreadTotal`) son el aviso.
 */
@Injectable()
export class OpenConversationUseCase {
  constructor(
    @Inject(DM_REPOSITORY) private readonly dm: DmRepository,
    @Inject(FOLLOW_REPOSITORY) private readonly follows: FollowRepository,
  ) {}

  async execute(viewerAccountId: string, otherAccountId: string): Promise<ConversationDto> {
    if (viewerAccountId === otherAccountId) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, 422, 'No puedes escribirte a ti.');
    }
    const conversation = await this.dm.getOrCreateConversation(viewerAccountId, otherAccountId);
    if (conversation) return conversation;
    // Distinguir 404 (no existe la cuenta) de 403 (par bloqueado) sin filtrar la dirección.
    if (!(await this.follows.accountExists(otherAccountId))) {
      throw new AppException(ErrorCode.NOT_FOUND, 404, 'La cuenta no existe.');
    }
    throw new AppException(ErrorCode.BLOCKED, 403, 'No puedes escribir a esta cuenta.');
  }
}

@Injectable()
export class ListConversationsUseCase {
  constructor(@Inject(DM_REPOSITORY) private readonly dm: DmRepository) {}

  async execute(viewerAccountId: string, query: ListQueryInput): Promise<ConversationsPageDto> {
    const { page, unreadTotal } = await this.dm.listConversations(
      viewerAccountId,
      clampLimit(query.limit),
      query.cursor ? decodeCursor(query.cursor) : null,
    );
    return { ...page, unreadTotal };
  }
}

@Injectable()
export class ListMessagesUseCase {
  constructor(@Inject(DM_REPOSITORY) private readonly dm: DmRepository) {}

  async execute(
    conversationId: string,
    viewerAccountId: string,
    query: ListQueryInput,
  ): Promise<Page<MessageDto>> {
    const page = await this.dm.listMessages(
      conversationId,
      viewerAccountId,
      clampLimit(query.limit),
      query.cursor ? decodeCursor(query.cursor) : null,
    );
    if (!page) throw new AppException(ErrorCode.NOT_FOUND, 404, 'Conversación no encontrada.');
    return page;
  }
}

@Injectable()
export class SendMessageUseCase {
  constructor(@Inject(DM_REPOSITORY) private readonly dm: DmRepository) {}

  async execute(
    conversationId: string,
    viewerAccountId: string,
    input: SendMessageInput,
  ): Promise<MessageDto> {
    const message = await this.dm.sendMessage(conversationId, viewerAccountId, input.body);
    // No procede = no es tu conversación O el par quedó bloqueado — mismo trato, sin oráculo.
    if (!message) throw new AppException(ErrorCode.NOT_FOUND, 404, 'Conversación no encontrada.');
    return message;
  }
}

@Injectable()
export class MarkConversationReadUseCase {
  constructor(@Inject(DM_REPOSITORY) private readonly dm: DmRepository) {}

  async execute(conversationId: string, viewerAccountId: string): Promise<void> {
    const ok = await this.dm.markRead(conversationId, viewerAccountId);
    if (!ok) throw new AppException(ErrorCode.NOT_FOUND, 404, 'Conversación no encontrada.');
  }
}

@Injectable()
export class DeleteMessageUseCase {
  constructor(@Inject(DM_REPOSITORY) private readonly dm: DmRepository) {}

  async execute(messageId: string, viewerAccountId: string): Promise<void> {
    const ok = await this.dm.deleteOwnMessage(messageId, viewerAccountId);
    if (!ok) throw new AppException(ErrorCode.NOT_FOUND, 404, 'Mensaje no encontrado.');
  }
}
