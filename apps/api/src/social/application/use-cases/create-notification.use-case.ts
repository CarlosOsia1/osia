import { Inject, Injectable } from '@nestjs/common';
import type { NotificationType } from '@osia/shared';
import { uuidV5 } from '../../../common/uuid-v5';
import {
  NOTIFICATION_REPOSITORY,
  type NotificationRepository,
} from '../ports/out/notification.repository';

/** Namespace fijo para derivar el id determinista de una notificación (uuid v5, por su clave natural). */
const NOTIFICATION_NS = '6f1b2c9a-6a3d-4e58-9b21-0d7c5e8a41f2';

/**
 * Crear una notificación (S3.4-H2). Lo invocan los listeners de eventos `social.*`. El no-auto-notificar
 * y la elección de destinatarios viven en el listener (que conoce actor vs receptor); aquí solo persiste.
 *
 * Ola 1C: el id se deriva determinísticamente de la clave natural del evento (destinatario + tipo + actor
 * + refs del payload), así que la escritura es IDEMPOTENTE. El outbox entrega at-least-once: si re-entrega
 * el mismo evento tras un crash, el id colisiona y no se crea una notificación duplicada.
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
    // La clave incluye lo que distingue una notificación única: destinatario, tipo, actor y las
    // referencias del payload (post/comentario/eco y el kind de reacción). Distintas acciones legítimas
    // (p. ej. reaccionar con otro kind, o un comentario nuevo) dan claves distintas → notifican; una
    // re-entrega del MISMO evento da la misma clave → no duplica.
    const key = [
      accountId,
      kind,
      actorAccountId ?? '',
      payload.postId ?? '',
      payload.commentId ?? '',
      payload.echoPostId ?? '',
      payload.kind ?? '',
    ]
      .map((v) => String(v))
      .join('|');
    const id = uuidV5(key, NOTIFICATION_NS);
    return this.notifications.create(id, accountId, kind, actorAccountId, payload);
  }
}
