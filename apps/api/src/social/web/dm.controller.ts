import { Body, Controller, Delete, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import {
  listQuerySchema,
  openConversationSchema,
  sendMessageSchema,
  type ConversationDto,
  type ConversationsPageDto,
  type ListQueryInput,
  type MessageDto,
  type OpenConversationInput,
  type Page,
  type SendMessageInput,
} from '@osia/shared';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';
import { AuthGuard, CurrentAccount, type AccountContext } from '../../common/auth.guard';
import { EmailVerifiedGuard } from '../../common/email-verified.guard';
import {
  DeleteMessageUseCase,
  ListConversationsUseCase,
  ListMessagesUseCase,
  MarkConversationReadUseCase,
  OpenConversationUseCase,
  SendMessageUseCase,
} from '../application/use-cases/dm.use-cases';

const uuidParam = new ZodValidationPipe(z.string().uuid());

/**
 * Mensajería directa (R5): `/v1/dm/...`. Bandeja + hilo keyset, abrir idempotente, enviar con
 * re-verificación de bloqueo, marcar leído y retirar lo propio. AuthGuard en todo; escrituras
 * exigen email verificado. Tiempo real por polling del cliente (Realtime es Ola 4).
 */
@Controller('dm')
@UseGuards(AuthGuard)
export class DmController {
  constructor(
    private readonly openConversation: OpenConversationUseCase,
    private readonly listConversations: ListConversationsUseCase,
    private readonly listMessages: ListMessagesUseCase,
    private readonly sendMessage: SendMessageUseCase,
    private readonly markRead: MarkConversationReadUseCase,
    private readonly deleteMessage: DeleteMessageUseCase,
  ) {}

  @Post('conversations')
  @UseGuards(EmailVerifiedGuard)
  async open(
    @CurrentAccount() account: AccountContext,
    @Body(new ZodValidationPipe(openConversationSchema)) body: OpenConversationInput,
  ): Promise<{ conversation: ConversationDto }> {
    return { conversation: await this.openConversation.execute(account.accountId, body.accountId) };
  }

  @Get('conversations')
  conversations(
    @CurrentAccount() account: AccountContext,
    @Query(new ZodValidationPipe(listQuerySchema)) query: ListQueryInput,
  ): Promise<ConversationsPageDto> {
    return this.listConversations.execute(account.accountId, query);
  }

  @Get('conversations/:id/messages')
  messages(
    @CurrentAccount() account: AccountContext,
    @Param('id', uuidParam) id: string,
    @Query(new ZodValidationPipe(listQuerySchema)) query: ListQueryInput,
  ): Promise<Page<MessageDto>> {
    return this.listMessages.execute(id, account.accountId, query);
  }

  @Post('conversations/:id/messages')
  @UseGuards(EmailVerifiedGuard)
  async send(
    @CurrentAccount() account: AccountContext,
    @Param('id', uuidParam) id: string,
    @Body(new ZodValidationPipe(sendMessageSchema)) body: SendMessageInput,
  ): Promise<{ message: MessageDto }> {
    return { message: await this.sendMessage.execute(id, account.accountId, body) };
  }

  @Post('conversations/:id/read')
  @HttpCode(204)
  async read(
    @CurrentAccount() account: AccountContext,
    @Param('id', uuidParam) id: string,
  ): Promise<void> {
    await this.markRead.execute(id, account.accountId);
  }

  @Delete('messages/:messageId')
  @HttpCode(204)
  @UseGuards(EmailVerifiedGuard)
  async remove(
    @CurrentAccount() account: AccountContext,
    @Param('messageId', uuidParam) messageId: string,
  ): Promise<void> {
    await this.deleteMessage.execute(messageId, account.accountId);
  }
}
