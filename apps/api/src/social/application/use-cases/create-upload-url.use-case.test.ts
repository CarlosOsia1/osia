/**
 * CreateUploadUrlUseCase (S3.3-H1) — delega en el StoragePort el minteo del destino prefirmado, pasando
 * la cuenta y el contentType validado. Fake del puerto (sin Supabase).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import type { UploadTargetDto } from '@osia/shared';
import { CreateUploadUrlUseCase } from './create-upload-url.use-case';
import type { StoragePort } from '../ports/out/storage.port';

const ACCOUNT = '0190b8e0-7c1e-7b3a-8a4e-000000000001';
const target: UploadTargetDto = {
  uploadUrl: 'https://ref.supabase.co/storage/v1/object/upload/sign/post-media/posts/x/y.png?token=t',
  publicUrl: 'https://ref.supabase.co/storage/v1/object/public/post-media/posts/x/y.png',
  path: 'posts/x/y.png',
};

test('mintea el destino pasando cuenta + contentType al puerto', async () => {
  const calls: Array<[string, string]> = [];
  const storage: StoragePort = {
    createUploadTarget: async (accountId, contentType) => {
      calls.push([accountId, contentType]);
      return target;
    },
    ownsPublicUrl: () => true,
    signMediaUrls: async () => new Map(),
    deleteByUrls: async () => {},
  };
  const uc = new CreateUploadUrlUseCase(storage);
  const res = await uc.execute(ACCOUNT, { contentType: 'image/png' });
  assert.deepEqual(res, target);
  assert.deepEqual(calls, [[ACCOUNT, 'image/png']]);
});
