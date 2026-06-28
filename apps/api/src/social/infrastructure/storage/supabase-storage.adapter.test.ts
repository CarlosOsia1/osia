/**
 * SupabaseStorageAdapter (S3.3-H1) — fija el invariante de `ownsPublicUrl`: solo URLs bajo el prefijo
 * público EXACTO del bucket pertenecen a OSIA. En particular, un bucket hermano cuyo nombre empiece con
 * `post-media` NO debe colarse (anti-abuso). Fake mínimo del cliente Supabase (sin red).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseStorageAdapter } from './supabase-storage.adapter';

const PUBLIC_BASE = 'https://ref.supabase.co/storage/v1/object/public';

/** Cliente fake: getPublicUrl(path) → `${PUBLIC_BASE}/<bucket>/<path>` (con barra, como storage-js). */
const fakeSupabase = (): SupabaseClient =>
  ({
    storage: {
      from: (bucket: string) => ({
        getPublicUrl: (path: string) => ({ data: { publicUrl: `${PUBLIC_BASE}/${bucket}/${path}` } }),
      }),
    },
  }) as unknown as SupabaseClient;

const adapter = new SupabaseStorageAdapter(fakeSupabase());

test('ownsPublicUrl: acepta una URL bajo el prefijo del bucket', () => {
  assert.equal(adapter.ownsPublicUrl(`${PUBLIC_BASE}/post-media/posts/acc/abc.png`), true);
});

test('ownsPublicUrl: rechaza un bucket hermano que empieza con el nombre (post-media-evil)', () => {
  assert.equal(adapter.ownsPublicUrl(`${PUBLIC_BASE}/post-media-evil/x.png`), false);
  assert.equal(adapter.ownsPublicUrl(`${PUBLIC_BASE}/post-mediaX/x.png`), false);
});

test('ownsPublicUrl: rechaza URLs externas y otros prefijos', () => {
  assert.equal(adapter.ownsPublicUrl('https://evil.example.com/post-media/x.png'), false);
  assert.equal(adapter.ownsPublicUrl(`${PUBLIC_BASE}/other-bucket/x.png`), false);
});
