import { Body, Controller, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import {
  markNotificationsReadSchema,
  notificationsQuerySchema,
  type MarkNotificationsReadInput,
  type NotificationsPageDto,
  type NotificationsQueryInput,
} from '@osia/shared';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';
import { AuthGuard, CurrentAccount, type AccountContext } from '../../common/auth.guard';
import { GetNotificationsUseCase } from '../application/use-cases/get-notifications.use-case';
import { MarkNotificationsReadUseCase } from '../application/use-cases/mark-notifications-read.use-case';

const idParam = new ZodValidationPipe(z.string().uuid());

/**
 * Notificaciones (S3.4-H2): `GET /v1/notifications` (página + `unreadCount`), `POST /v1/notifications/read`
 * (marca todas o `ids`), `POST /v1/notifications/{id}/read` (marca una). Protegido (AuthGuard); cada quien
 * solo ve/marca las suyas.
 */
@Controller('notifications')
@UseGuards(AuthGuard)
export class NotificationController {
  constructor(
    private readonly getNotifications: GetNotificationsUseCase,
    private readonly markRead: MarkNotificationsReadUseCase,
  ) {}

  @Get()
  list(
    @CurrentAccount() account: AccountContext,
    @Query(new ZodValidationPipe(notificationsQuerySchema)) query: NotificationsQueryInput,
  ): Promise<NotificationsPageDto> {
    return this.getNotifications.execute(account.accountId, query);
  }

  @Post('read')
  @HttpCode(204)
  async readMany(
    @CurrentAccount() account: AccountContext,
    @Body(new ZodValidationPipe(markNotificationsReadSchema)) body: MarkNotificationsReadInput,
  ): Promise<void> {
    await this.markRead.markMany(account.accountId, body);
  }

  @Post(':id/read')
  @HttpCode(204)
  async readOne(
    @CurrentAccount() account: AccountContext,
    @Param('id', idParam) id: string,
  ): Promise<void> {
    await this.markRead.markOne(account.accountId, id);
  }
}
