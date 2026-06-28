import { Inject, Injectable } from '@nestjs/common';
import { ErrorCode, type MarkNotificationsReadInput } from '@osia/shared';
import { AppException } from '../../../common/app-exception';
import {
  NOTIFICATION_REPOSITORY,
  type NotificationRepository,
} from '../ports/out/notification.repository';

/**
 * Marcar notificaciones leídas (S3.4-H2). Sin `ids` = todas las no-leídas; con `ids` = solo esas. Y el
 * marcado de UNA por id (idempotente; 404 si no es del residente). Solo afecta las propias.
 */
@Injectable()
export class MarkNotificationsReadUseCase {
  constructor(@Inject(NOTIFICATION_REPOSITORY) private readonly notifications: NotificationRepository) {}

  markMany(accountId: string, input: MarkNotificationsReadInput): Promise<void> {
    return this.notifications.markRead(accountId, input.ids);
  }

  async markOne(accountId: string, id: string): Promise<void> {
    const ok = await this.notifications.markOneRead(accountId, id);
    if (!ok) throw new AppException(ErrorCode.NOT_FOUND, 404, 'Notificación no encontrada.');
  }
}
