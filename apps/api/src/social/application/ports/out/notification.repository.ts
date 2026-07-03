import type { Cursor, NotificationDto, NotificationType, Page } from '@osia/shared';

export const NOTIFICATION_REPOSITORY = Symbol('NOTIFICATION_REPOSITORY');

export interface NotificationRepository {
  /**
   * Crea una notificación para `accountId` (el destinatario). `actorAccountId` null = de sistema.
   * `id` es determinista (uuid v5 de la clave natural del evento) → `ON CONFLICT DO NOTHING`: si el
   * outbox re-entrega el mismo evento tras un crash, la notificación no se duplica (Ola 1C).
   */
  create(
    id: string,
    accountId: string,
    kind: NotificationType,
    actorAccountId: string | null,
    payload: Record<string, unknown>,
  ): Promise<void>;

  /** Página keyset (más recientes primero) de las notificaciones del destinatario. */
  list(
    accountId: string,
    limit: number,
    cursor: Cursor | null,
    unreadOnly: boolean,
  ): Promise<Page<NotificationDto>>;

  /** Cuántas no-leídas tiene el destinatario (badge). */
  unreadCount(accountId: string): Promise<number>;

  /** Marca leídas: todas las no-leídas del destinatario, o solo `ids` si se pasan. */
  markRead(accountId: string, ids?: string[]): Promise<void>;

  /** Marca una leída (idempotente). `false` si no existe o no es del destinatario (→ 404). */
  markOneRead(accountId: string, id: string): Promise<boolean>;
}
