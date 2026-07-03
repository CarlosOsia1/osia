/**
 * PostMediaSigner (Ola 1D) — reescribe la media DIRECTA del post y la del original embebido de un eco
 * (`referencedPost.media`) con las URLs firmadas; deja intactas las que el Storage no reconoce; junta
 * todas las URLs de la página en UNA firma en lote. Fake del StoragePort.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import type { PostDto } from '@osia/shared';
import { PostMediaSigner } from './post-media-signer.service';
import type { StoragePort } from './ports/out/storage.port';

/** StoragePort fake: firma añadiendo `?sig` a las URLs que empiezan por `ours://`; ignora el resto. */
function fakeStorage() {
  const batches: string[][] = [];
  const storage: StoragePort = {
    createUploadTarget: async () => {
      throw new Error('no usado');
    },
    ownsPublicUrl: () => true,
    signMediaUrls: async (urls) => {
      batches.push(urls);
      return new Map(urls.filter((u) => u.startsWith('ours://')).map((u) => [u, `${u}?sig`]));
    },
    deleteByUrls: async () => {},
  };
  return { storage, batches };
}

const makePost = (media: string[], refMedia?: string[]): PostDto =>
  ({
    id: 'p1',
    media: media.map((url) => ({ url, kind: 'image' })),
    referencedPost: refMedia ? { media: refMedia.map((url) => ({ url, kind: 'image' })) } : null,
  }) as unknown as PostDto;

test('firma la media directa y la del original embebido; deja la ajena intacta', async () => {
  const { storage } = fakeStorage();
  const post = makePost(['ours://a.png', 'https://externo/x.png'], ['ours://ref.png']);
  await new PostMediaSigner(storage).signPost(post);
  assert.equal(post.media[0]!.url, 'ours://a.png?sig');
  assert.equal(post.media[1]!.url, 'https://externo/x.png'); // ajena: sin cambio
  assert.equal(post.referencedPost!.media[0]!.url, 'ours://ref.png?sig');
});

test('firma una página en UNA sola llamada en lote (junta todas las URLs)', async () => {
  const { storage, batches } = fakeStorage();
  const posts = [makePost(['ours://a.png']), makePost(['ours://b.png'], ['ours://c.png'])];
  await new PostMediaSigner(storage).signPosts(posts);
  assert.equal(batches.length, 1, 'una sola firma en lote para toda la página');
  assert.deepEqual([...batches[0]!].sort(), ['ours://a.png', 'ours://b.png', 'ours://c.png']);
  assert.equal(posts[1]!.media[0]!.url, 'ours://b.png?sig');
  assert.equal(posts[1]!.referencedPost!.media[0]!.url, 'ours://c.png?sig');
});

test('sin media no llama al Storage', async () => {
  const { storage, batches } = fakeStorage();
  await new PostMediaSigner(storage).signPost(makePost([]));
  assert.equal(batches.length, 0);
});

test('signPost(null) es no-op', async () => {
  const { storage, batches } = fakeStorage();
  await new PostMediaSigner(storage).signPost(null);
  assert.equal(batches.length, 0);
});
