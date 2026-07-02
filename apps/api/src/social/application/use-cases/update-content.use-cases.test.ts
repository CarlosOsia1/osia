/**
 * UpdatePost/UpdateComment (R4.1) — editar SOLO lo propio: el repo devuelve null para lo ajeno o
 * inexistente y el use-case responde 404 sin oráculo; el DTO editado vuelve para el cache.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import type { CommentDto, PostDto } from '@osia/shared';
import { UpdatePostUseCase } from './update-post.use-case';
import { UpdateCommentUseCase } from './update-comment.use-case';
import type { PostRepository } from '../ports/out/post.repository';
import type { CommentRepository } from '../ports/out/comment.repository';
import { AppException } from '../../../common/app-exception';

const edited = { id: 'p1', body: 'nuevo', editedAt: '2026-07-02T12:00:00.000Z' } as unknown as PostDto;

function postsRepo(result: PostDto | null): PostRepository {
  return {
    createPost: () => Promise.reject(new Error('no aplica')),
    getById: () => Promise.resolve(null),
    softDelete: () => Promise.resolve(false),
    createEcho: () => Promise.resolve(null),
    removeSimpleEcho: () => Promise.resolve(false),
    updateBody: (postId, author, body) => {
      assert.equal(postId, 'p1');
      assert.equal(author, 'a1');
      assert.equal(body, 'nuevo');
      return Promise.resolve(result);
    },
  };
}

test('updatePost: edita lo propio y devuelve el DTO con editedAt', async () => {
  const result = await new UpdatePostUseCase(postsRepo(edited)).execute('p1', 'a1', { body: 'nuevo' });
  assert.equal(result.editedAt, '2026-07-02T12:00:00.000Z');
});

test('updatePost: ajeno o inexistente → 404 sin oráculo', async () => {
  await assert.rejects(
    () => new UpdatePostUseCase(postsRepo(null)).execute('p1', 'a1', { body: 'nuevo' }),
    (e: unknown) => e instanceof AppException && e.status === 404,
  );
});

const editedComment = { id: 'c1', body: 'nuevo' } as unknown as CommentDto;

function commentsRepo(result: CommentDto | null): CommentRepository {
  return {
    createComment: () => Promise.resolve(null),
    resolveMentionedAccountIds: () => Promise.resolve([]),
    listComments: () => Promise.resolve(null),
    softDeleteOwnComment: () => Promise.resolve(false),
    updateOwnComment: () => Promise.resolve(result),
  };
}

test('updateComment: edita lo propio; ajeno → 404', async () => {
  const ok = await new UpdateCommentUseCase(commentsRepo(editedComment)).execute('c1', 'a1', {
    body: 'nuevo',
  });
  assert.equal(ok.id, 'c1');
  await assert.rejects(
    () => new UpdateCommentUseCase(commentsRepo(null)).execute('c1', 'a1', { body: 'nuevo' }),
    (e: unknown) => e instanceof AppException && e.status === 404,
  );
});
