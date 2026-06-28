import { Inject, Injectable } from '@nestjs/common';
import {
  clampLimit,
  decodeCursor,
  type NotificationsPageDto,
  type NotificationsQueryInput,
} from '@osia/shared';
import {
  NOTIFICATION_REPOSITORY,
  type NotificationRepository,
} from '../ports/out/notification.repository';

/**
 * Listar notificaciones del residente (S3.4-H2): página keyset (recientes primero) + contador de
 * no-leídas (badge). Filtro opcional `unread`.
 */
@Injectable()
export class GetNotificationsUseCase {
  constructor(@Inject(NOTIFICATION_REPOSITORY) private readonly notifications: NotificationRepository) {}

  async execute(accountId: string, query: NotificationsQueryInput): Promise<NotificationsPageDto> {
    const page = await this.notifications.list(
      accountId,
      clampLimit(query.limit),
      query.cursor ? decodeCursor(query.cursor) : null,
      query.unread === 'true',
    );
    const unreadCount = await this.notifications.unreadCount(accountId);
    return { ...page, unreadCount };
  }
}
