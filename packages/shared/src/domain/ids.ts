/**
 * Branded IDs — evitan la "primitive obsession" (CLAUDE.md §1.2 / §5): un `EntityId`
 * NO se puede mezclar con cualquier `number`. En el cable siguen siendo enteros; el
 * brand vive solo en el sistema de tipos (cero costo en runtime).
 *
 * `EntityId` (F0): identidad de una entidad/jugador dentro de una instancia del mundo.
 * `AccountId` (se densifica en Fase 1): identidad de cuenta — en F0 es efímera, derivada
 * del handle; en Fase 1 pasa a ser el `accounts.id` persistente del pasaporte.
 * `ProfileId` (Fase 1): identidad del pasaporte (`profiles.id`); distinta de `AccountId`
 * (1:1 hoy, pero conceptualmente separadas — evita confundir cuenta con perfil público).
 */

declare const brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [brand]: B };

export type EntityId = Brand<number, 'EntityId'>;
export type AccountId = Brand<string, 'AccountId'>;
export type ProfileId = Brand<string, 'ProfileId'>;

/** Construye un `EntityId` desde un entero del cable (única puerta de creación). */
export const asEntityId = (n: number): EntityId => n as EntityId;
/** Construye un `AccountId` (Fase 1: el `accounts.id`; F0: derivado del handle). */
export const asAccountId = (s: string): AccountId => s as AccountId;
/** Construye un `ProfileId` (Fase 1: el `profiles.id`). */
export const asProfileId = (s: string): ProfileId => s as ProfileId;

/**
 * IDs del Tejido Social (Fase 3 — S3.1-H4). En la DB son `uuid` (uuidv7) y en el cable viajan como
 * string; el brand vive solo en el sistema de tipos (cero costo en runtime) y evita mezclar, p. ej.,
 * un `PostId` con un `CommentId`.
 */
export type PostId = Brand<string, 'PostId'>;
export type CommentId = Brand<string, 'CommentId'>;
export type ReactionId = Brand<string, 'ReactionId'>;
export type FollowId = Brand<string, 'FollowId'>;
export type NotificationId = Brand<string, 'NotificationId'>;

/** Construye un `PostId` (el `social.posts.id`). */
export const asPostId = (s: string): PostId => s as PostId;
/** Construye un `CommentId` (el `social.comments.id`). */
export const asCommentId = (s: string): CommentId => s as CommentId;
/** Construye un `ReactionId` (el `social.reactions.id`). */
export const asReactionId = (s: string): ReactionId => s as ReactionId;
/** Construye un `FollowId` (el `social.follows.id`). */
export const asFollowId = (s: string): FollowId => s as FollowId;
/** Construye un `NotificationId` (el `social.notifications.id`). */
export const asNotificationId = (s: string): NotificationId => s as NotificationId;

/** IDs de mensajería directa (R5). */
export type ConversationId = Brand<string, 'ConversationId'>;
export type MessageId = Brand<string, 'MessageId'>;

/** Construye un `ConversationId` (el `social.dm_conversations.id`). */
export const asConversationId = (s: string): ConversationId => s as ConversationId;
/** Construye un `MessageId` (el `social.dm_messages.id`). */
export const asMessageId = (s: string): MessageId => s as MessageId;
