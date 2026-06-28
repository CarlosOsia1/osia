import type { SocialFollowCreatedPayload } from '@osia/shared';

export const SOCIAL_EVENT_PUBLISHER = Symbol('SOCIAL_EVENT_PUBLISHER');

/**
 * Puerto de salida para publicar eventos de dominio del Tejido Social en el bus interno de `apps/api`.
 * El caso de uso depende de ESTA abstracción (no de `@nestjs/event-emitter`): el adapter concreto vive
 * en `infrastructure/messaging` (inversión de dependencias §1.1-D). Cada evento se agrega a este puerto
 * en la HU que lo emite. S3.2-H3: `followCreated` (lo consume reputación; S3.4 lo reusará para notif).
 */
export interface SocialEventPublisher {
  /** Anuncia una arista de seguimiento NUEVA (no el re-follow idempotente). */
  followCreated(payload: SocialFollowCreatedPayload): void;
}
