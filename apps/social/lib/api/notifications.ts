import { notificationsPageDtoSchema, type NotificationsPageDto } from '@osia/shared';
import { apiCall, apiVoid } from './client';

/** Notificaciones sociales (S3.4-H2): lista + contador de no-leídas para el badge. */

/** Lee notificaciones (`GET /v1/notifications`): página + `unreadCount` para el badge. */
export function getNotifications(): Promise<NotificationsPageDto> {
  return apiCall('/v1/notifications', notificationsPageDtoSchema);
}

/** Marca todas las notificaciones como leídas (`POST /v1/notifications/read`). */
export function markAllNotificationsRead(): Promise<void> {
  return apiVoid('/v1/notifications/read', { method: 'POST', body: {} });
}
