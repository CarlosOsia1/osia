/**
 * Contract tests de los esquemas de RESPUESTA del Tejido Social (Ola 3, R1): vectores realistas
 * que fijan la forma del cable API→cliente. Refuerzan tres invariantes:
 *  1. Tolerant reader: un campo NUEVO del servidor no rompe al cliente (sin `.strict()`).
 *  2. Corrupción sí falla: campo faltante, tipo errado o enum fuera de gamut → parse inválido.
 *  3. `GET /v1/presence` es `{ presence: [...] }`, NO el array a pelo (el cliente viejo lo tipaba
 *     como array y la presencia del perfil nunca funcionó — que no regrese).
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  feedItemDtoSchema,
  notificationsPageDtoSchema,
  pageOf,
  postDtoSchema,
  postResponseSchema,
  presenceResponseSchema,
  profileSummariesResponseSchema,
  publicProfileDtoSchema,
  reactionResultSchema,
} from './schemas/social-responses';
import { profileBriefSchema } from './schemas/profile-responses';

const UUID = '0190b8e0-7c1e-7b3a-8a4e-3f2b1c0d9e8f';
const UUID2 = '0190b8e0-7c1e-7b3a-8a4e-3f2b1c0d9e90';

const brief = {
  profileId: UUID,
  handle: 'elena_riva',
  displayName: 'Elena Riva',
  avatarUrl: null,
  accentColor: '#CBB89A',
  popularityPoints: 12,
};

const post = {
  id: UUID,
  author: brief,
  kind: 'image',
  body: 'La niebla de hoy',
  media: [{ url: 'https://storage.osia.com/post-media/a.webp', kind: 'image' }],
  visibility: 'public',
  reactionCount: 3,
  commentCount: 1,
  viewerReaction: 'star',
  recentReactors: [brief],
  editedAt: null,
  viewerBookmarked: false,
  createdAt: '2026-07-02T12:00:00.000Z',
  updatedAt: '2026-07-02T12:00:00.000Z',
  echoCount: 0,
  viewerEchoed: false,
  referencedPost: null,
};

// --- Vectores válidos (round-trip: el parse devuelve los mismos datos; el brand es solo de tipos) ---

test('postDto: vector realista parsea y conserva los valores en runtime', () => {
  const parsed = postDtoSchema.parse(post);
  assert.equal(parsed.id, UUID);
  assert.equal(parsed.author.handle, 'elena_riva');
  assert.equal(parsed.viewerReaction, 'star');
  assert.equal(parsed.media[0]?.kind, 'image');
  // Social proof (R2): la fila de reactores viaja en el post; si falta, es corrupción.
  assert.equal(parsed.recentReactors[0]?.handle, 'elena_riva');
  const { recentReactors: _omitidos, ...sinReactores } = post;
  assert.ok(!postDtoSchema.safeParse(sinReactores).success);
});

test('postResponse: el sobre es { post }, no el post a pelo', () => {
  assert.ok(postResponseSchema.safeParse({ post }).success);
  assert.ok(!postResponseSchema.safeParse(post).success);
});

test('tolerant reader: un campo desconocido del servidor NO rompe al cliente', () => {
  const conExtra = { ...post, camposDelFuturo: { a: 1 } };
  const parsed = postDtoSchema.parse(conExtra);
  // …y tampoco se cuela en la salida (strip por defecto).
  assert.ok(!('camposDelFuturo' in parsed));
});

test('corrupción sí falla: campo faltante, tipo errado o enum fuera de gamut', () => {
  const { reactionCount: _omitido, ...sinContador } = post;
  assert.ok(!postDtoSchema.safeParse(sinContador).success);
  assert.ok(!postDtoSchema.safeParse({ ...post, reactionCount: '3' }).success);
  assert.ok(!postDtoSchema.safeParse({ ...post, visibility: 'friends' }).success);
  assert.ok(!postDtoSchema.safeParse({ ...post, viewerReaction: 'moon' }).success);
  assert.ok(!profileBriefSchema.safeParse({ ...brief, avatarUrl: undefined }).success);
});

test('publicProfile: viewerState dentro del gamut; nullables reales', () => {
  const profile = {
    ...brief,
    accountId: UUID2,
    bio: null,
    reputation: 4,
    followersCount: 2,
    followingCount: 7,
    isFollowing: false,
    isPrivate: true,
    photoUrl: null,
    coverUrl: null,
    viewerState: 'requested',
    canViewContent: false,
    blockedByViewer: false,
    mutedByViewer: false,
  };
  assert.ok(publicProfileDtoSchema.safeParse(profile).success);
  assert.ok(!publicProfileDtoSchema.safeParse({ ...profile, viewerState: 'stalker' }).success);
});

test('reactionResult: reacción + contador actualizado', () => {
  const result = {
    reaction: { id: UUID, postId: UUID2, accountId: UUID, kind: 'star', createdAt: post.createdAt },
    reactionCount: 4,
  };
  assert.ok(reactionResultSchema.safeParse(result).success);
  assert.ok(!reactionResultSchema.safeParse({ ...result, reactionCount: undefined }).success);
});

// --- Page<T> y sus derivados ---

test('pageOf: página keyset válida; nextCursor null al final', () => {
  const page = pageOf(feedItemDtoSchema);
  const feedItem = { id: UUID, post, reason: 'follow', score: 1, createdAt: post.createdAt };
  const ok = page.parse({ data: [feedItem], page: { nextCursor: null, hasMore: false, limit: 20 } });
  assert.equal(ok.data[0]?.post.author.displayName, 'Elena Riva');
  assert.ok(!page.safeParse({ data: [feedItem], page: { hasMore: false, limit: 20 } }).success);
});

test('notificationsPage: página + unreadCount (badge)', () => {
  const notif = {
    id: UUID,
    type: 'mention',
    actor: brief,
    payload: { postId: UUID2 },
    readAt: null,
    createdAt: post.createdAt,
  };
  const ok = notificationsPageDtoSchema.parse({
    data: [notif],
    page: { nextCursor: 'opaco', hasMore: true, limit: 20 },
    unreadCount: 5,
  });
  assert.equal(ok.unreadCount, 5);
  assert.ok(
    !notificationsPageDtoSchema.safeParse({
      data: [notif],
      page: { nextCursor: null, hasMore: false, limit: 20 },
    }).success,
  );
});

// --- Presencia: el sobre correcto (regresión del bug cazado en R1) ---

test('presence: es { presence: [...] }; el array a pelo se RECHAZA (bug del cliente viejo)', () => {
  const entry = { accountId: UUID, online: true, zone: 'El Claro', instanceId: 'i-1', lastSeen: null };
  assert.ok(presenceResponseSchema.safeParse({ presence: [entry] }).success);
  assert.ok(!presenceResponseSchema.safeParse([entry]).success);
});

// --- Descubrir/Buscar: lista plana sin `self` ---

test('profileSummaries: lista plana; viewerState nunca es self', () => {
  const summary = { ...brief, accountId: UUID2, viewerState: 'none' };
  assert.ok(profileSummariesResponseSchema.safeParse([summary]).success);
  assert.ok(!profileSummariesResponseSchema.safeParse([{ ...summary, viewerState: 'self' }]).success);
});
