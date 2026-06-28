/**
 * Contract tests del Tejido Social (S3.1-H4 DoD): enums espejo del ER, IDs branded, catálogo de
 * eventos, código de error y esquemas Zod (validación cliente+servidor). Corre con `tsx` (node:test).
 *
 * Refuerza dos invariantes de la fase: (1) la IA está descartada al 100% — no existe `gossip` ni en
 * `NotificationType` ni en el catálogo de eventos; (2) los contratos no divergen del ER/docs/10.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  isReactionKind,
  isPostKind,
  isPostVisibility,
  isFollowStatus,
  isFeedReason,
  isNotificationType,
  REACTION_KIND_VALUES,
  NOTIFICATION_TYPE_VALUES,
} from './domain/enums';
import { asPostId, asCommentId, asReactionId, asFollowId, asNotificationId } from './domain/ids';
import { ErrorCode, isErrorCode } from './rest/errors';
import { SOCIAL_EVENTS, isSocialEvent } from './catalog/events';
import {
  createPostSchema,
  createCommentSchema,
  setReactionSchema,
  followSchema,
  markNotificationsReadSchema,
  listQuerySchema,
  notificationsQuerySchema,
  presenceQuerySchema,
} from './schemas/social';
import { POST_BODY_MAX, COMMENT_BODY_MAX } from './rest/dto/social';

const UUID_V7 = '0190b8e0-7c1e-7b3a-8a4e-3f2b1c0d9e8f';

// --- Enums (espejo de los CHECK del ER §7) ---
test('social enums: reacciones dentro del gamut house-celestial (star|moon|sun)', () => {
  assert.deepEqual([...REACTION_KIND_VALUES], ['star', 'moon', 'sun']);
  assert.ok(isReactionKind('moon'));
  assert.ok(!isReactionKind('glow')); // valor de ejemplo del backlog, NO del ER
  assert.ok(!isReactionKind('like'));
});

test('social enums: post kind/visibility y feed/follow guards', () => {
  assert.ok(isPostKind('text') && isPostKind('image') && isPostKind('moment'));
  assert.ok(!isPostKind('video'));
  assert.ok(isPostVisibility('followers'));
  assert.ok(!isPostVisibility('friends'));
  assert.ok(isFollowStatus('active') && isFollowStatus('blocked'));
  assert.ok(!isFollowStatus('pending'));
  assert.ok(isFeedReason('follow') && isFeedReason('trending') && isFeedReason('event'));
  assert.ok(!isFeedReason('ad'));
});

test('social enums: NotificationType NO incluye gossip (IA descartada 100%)', () => {
  assert.deepEqual([...NOTIFICATION_TYPE_VALUES], ['follow', 'reaction', 'comment', 'mention']);
  assert.ok(isNotificationType('mention'));
  assert.ok(!isNotificationType('gossip')); // ❌ IA
});

// --- Branded IDs (round-trip; el brand es solo de tipos) ---
test('social ids: constructores devuelven el string crudo en runtime', () => {
  assert.equal(asPostId(UUID_V7), UUID_V7);
  assert.equal(asCommentId('c'), 'c');
  assert.equal(asReactionId('r'), 'r');
  assert.equal(asFollowId('f'), 'f');
  assert.equal(asNotificationId('n'), 'n');
});

// --- ErrorCode ---
test('social errors: ALREADY_REACTED canónico y conocido; los de follow existen', () => {
  assert.equal(ErrorCode.ALREADY_REACTED, 'ALREADY_REACTED');
  assert.ok(isErrorCode('ALREADY_REACTED'));
  assert.ok(isErrorCode(ErrorCode.ALREADY_FOLLOWING));
  assert.ok(isErrorCode(ErrorCode.CANNOT_FOLLOW_SELF));
});

// --- Catálogo de eventos (sin gossip) ---
test('social events: nombres canónicos presentes; gossip ausente (IA)', () => {
  assert.ok(isSocialEvent('social.post.published'));
  assert.ok(isSocialEvent('social.follow.removed'));
  assert.ok(isSocialEvent('social.notification.created'));
  assert.ok(!isSocialEvent('social.gossip.published')); // ❌ IA
  assert.ok(!isSocialEvent('social.unknown'));
  assert.equal(SOCIAL_EVENTS.length, 6);
});

// --- createPostSchema ---
test('createPost: aplica defaults (text/public) y exige texto o media', () => {
  const ok = createPostSchema.parse({ body: 'hola mundo' });
  assert.equal(ok.kind, 'text');
  assert.equal(ok.visibility, 'public');

  // post solo-media válido
  assert.ok(
    createPostSchema.safeParse({ kind: 'image', media: ['https://r2.osia.com/a.jpg'] }).success,
  );
  // vacío (sin texto ni media) → rechazado por refine
  assert.ok(!createPostSchema.safeParse({}).success);
});

test('createPost: límites de body y media, url válida y strict', () => {
  assert.ok(!createPostSchema.safeParse({ body: 'a'.repeat(POST_BODY_MAX + 1) }).success);
  assert.ok(createPostSchema.safeParse({ body: 'a'.repeat(POST_BODY_MAX) }).success);
  // más de 4 adjuntos
  assert.ok(
    !createPostSchema.safeParse({ body: 'x', media: Array(5).fill('https://a.co/x.png') }).success,
  );
  // url inválida
  assert.ok(!createPostSchema.safeParse({ body: 'x', media: ['no-es-url'] }).success);
  // strict: clave desconocida
  assert.ok(!createPostSchema.safeParse({ body: 'x', foo: 1 }).success);
});

// --- createCommentSchema ---
test('createComment: 1..MAX, parentCommentId uuid opcional', () => {
  assert.ok(createCommentSchema.safeParse({ body: 'buen post' }).success);
  assert.ok(createCommentSchema.safeParse({ body: 'x', parentCommentId: UUID_V7 }).success);
  assert.ok(!createCommentSchema.safeParse({ body: '' }).success);
  assert.ok(!createCommentSchema.safeParse({ body: 'a'.repeat(COMMENT_BODY_MAX + 1) }).success);
  assert.ok(!createCommentSchema.safeParse({ body: 'x', parentCommentId: 'no-uuid' }).success);
});

// --- setReactionSchema ---
test('setReaction: kind dentro del gamut; rechaza fuera de marca', () => {
  assert.ok(setReactionSchema.safeParse({ kind: 'star' }).success);
  assert.ok(!setReactionSchema.safeParse({ kind: 'glow' }).success);
  assert.ok(!setReactionSchema.safeParse({}).success);
});

// --- followSchema (canónico docs/10: followeeAccountId) ---
test('follow: exige followeeAccountId uuid', () => {
  assert.ok(followSchema.safeParse({ followeeAccountId: UUID_V7 }).success);
  assert.ok(!followSchema.safeParse({ followeeAccountId: 'x' }).success);
  assert.ok(!followSchema.safeParse({}).success);
});

// --- markNotificationsReadSchema ---
test('markNotificationsRead: sin ids = todas; ids uuid válidos', () => {
  assert.ok(markNotificationsReadSchema.safeParse({}).success);
  assert.ok(markNotificationsReadSchema.safeParse({ ids: [UUID_V7] }).success);
  assert.ok(!markNotificationsReadSchema.safeParse({ ids: ['no-uuid'] }).success);
});

// --- queries de listado/presencia ---
test('listQuery: coacciona limit de string y respeta tope', () => {
  assert.equal(listQuerySchema.parse({ limit: '20' }).limit, 20);
  assert.ok(!listQuerySchema.safeParse({ limit: '0' }).success); // positive
  assert.ok(!listQuerySchema.safeParse({ limit: '101' }).success); // > MAX_PAGE_LIMIT
  assert.ok(listQuerySchema.safeParse({ cursor: 'opaco' }).success);
});

test('notificationsQuery: unread true/false → boolean; otro string falla', () => {
  assert.equal(notificationsQuerySchema.parse({ unread: 'true' }).unread, true);
  assert.equal(notificationsQuerySchema.parse({ unread: 'false' }).unread, false);
  assert.ok(!notificationsQuerySchema.safeParse({ unread: 'sí' }).success);
});

test('presenceQuery: parsea CSV de UUIDs a array, vacío → [], rechaza basura', () => {
  const two = `${UUID_V7},${UUID_V7}`;
  assert.deepEqual(presenceQuerySchema.parse({ accountIds: two }).accountIds, [UUID_V7, UUID_V7]);
  // ausente o vacío → []
  assert.deepEqual(presenceQuerySchema.parse({}).accountIds, []);
  assert.deepEqual(presenceQuerySchema.parse({ accountIds: '' }).accountIds, []);
  // recorta espacios alrededor de los ids
  assert.deepEqual(presenceQuerySchema.parse({ accountIds: ` ${UUID_V7} ` }).accountIds, [UUID_V7]);
  // un id no-uuid en el CSV → rechazado
  assert.ok(!presenceQuerySchema.safeParse({ accountIds: `${UUID_V7},basura` }).success);
});
