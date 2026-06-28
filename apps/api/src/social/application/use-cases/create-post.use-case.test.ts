/**
 * CreatePostUseCase (S3.3-H1) — publica un post; rechaza adjuntos externos (no de nuestro Storage) con
 * VALIDATION_FAILED antes de persistir; acepta adjuntos propios. Fakes del repo y del StoragePort.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  asPostId,
  asProfileId,
  ErrorCode,
  type CreatePostInput,
  type PostDto,
  type ProfileBrief,
} from '@osia/shared';
import { CreatePostUseCase } from './create-post.use-case';
import type { PostRepository } from '../ports/out/post.repository';
import type { StoragePort } from '../ports/out/storage.port';
import { AppException } from '../../../common/app-exception';

const ACCOUNT = '0190b8e0-7c1e-7b3a-8a4e-000000000001';
const OWN = 'https://ref.supabase.co/storage/v1/object/public/post-media/posts/x/y.png';
const FOREIGN = 'https://evil.example.com/x.png';

const author: ProfileBrief = {
  profileId: asProfileId('0190b8e0-7c1e-7b3a-8a4e-0000000000aa'),
  handle: 'ariadna',
  displayName: 'Ariadna',
  avatarUrl: null,
  accentColor: '#CBB89A',
  popularityPoints: 0,
};

const makePost = (input: CreatePostInput): PostDto => ({
  id: asPostId('0190b8e0-7c1e-7b3a-8a4e-0000000000ff'),
  author,
  kind: input.kind ?? 'text',
  body: input.body ?? null,
  media: input.media ?? [],
  visibility: input.visibility ?? 'public',
  reactionCount: 0,
  commentCount: 0,
  viewerReaction: null,
  createdAt: '2026-06-28T00:00:00.000Z',
  updatedAt: '2026-06-28T00:00:00.000Z',
});

/** Construye un `CreatePostInput` ya "parseado" (kind/visibility presentes, como los entrega Zod). */
const input = (p: Partial<CreatePostInput>): CreatePostInput => ({ kind: 'text', visibility: 'public', ...p });

const deps = (over: { owns?: (u: string) => boolean } = {}) => {
  const created: CreatePostInput[] = [];
  const posts: PostRepository = {
    createPost: async (_acc, input) => {
      created.push(input);
      return makePost(input);
    },
  };
  const storage: StoragePort = {
    createUploadTarget: async () => {
      throw new Error('no usado');
    },
    ownsPublicUrl: over.owns ?? ((u) => u.startsWith('https://ref.supabase.co/storage/v1/object/public/post-media/')),
  };
  return { posts, storage, created };
};

test('publica un post de solo texto', async () => {
  const { posts, storage, created } = deps();
  const uc = new CreatePostUseCase(posts, storage);
  const post = await uc.execute(ACCOUNT, input({ body: 'Hola mundo' }));
  assert.equal(post.body, 'Hola mundo');
  assert.equal(created.length, 1);
});

test('publica un post con adjunto de nuestro Storage', async () => {
  const { posts, storage, created } = deps();
  const uc = new CreatePostUseCase(posts, storage);
  const post = await uc.execute(ACCOUNT, input({ kind: 'image', media: [OWN] }));
  assert.deepEqual(post.media, [OWN]);
  assert.equal(created.length, 1);
});

test('rechaza un adjunto externo (no de OSIA) con VALIDATION_FAILED y no persiste', async () => {
  const { posts, storage, created } = deps();
  const uc = new CreatePostUseCase(posts, storage);
  await assert.rejects(
    () => uc.execute(ACCOUNT, input({ body: 'mira', media: [FOREIGN] })),
    (e: unknown) => e instanceof AppException && e.code === ErrorCode.VALIDATION_FAILED && e.status === 422,
  );
  assert.equal(created.length, 0);
});
