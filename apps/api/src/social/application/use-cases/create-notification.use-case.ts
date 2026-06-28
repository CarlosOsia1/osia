import { Inject, Injectable } from '@nestjs/common';
import type { NotificationType } from '@osia/shared';
import {
  NOTIFICATION_REPOSITORY,
  type NotificationRepository,
} from '../ports/out/notification.repository';

/**
 * Crear una notificación (S3.4-H2). Lo invocan los listeners de eventos `social.*`. El no-auto-notificar
 * y la elección de destinatarios viven en el listener (que conoce actor vs receptor); aquí solo persiste.
 */
@Injectable()
export class CreateNotificationUseCase {
  constructor(@Inject(NOTIFICATION_REPOSITORY) private readonly notifications: NotificationRepository) {}

  execute(
    accountId: string,
    kind: NotificationType,
    actorAccountId: string | null,
    payload: Record<string, unknown>,
  ): Promise<void> {
    return this.notifications.create(accountId, kind, actorAccountId, payload);
  }
}
