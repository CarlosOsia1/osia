/** UpdateProfileCardUseCase (S3.8) — valida que la media sea de nuestro Storage y hace upsert. */
import test from 'node:test';
import assert from 'node:assert/strict';
import type { ProfileMediaKind, UploadTargetDto } from '@osia/shared';
import { UpdateProfileCardUseCase } from './update-profile-card.use-case';
import type { ProfileCardPatch, ProfileCardRepository } from '../ports/out/profile-card.repository';
import type { ProfileMediaStoragePort } from '../ports/out/profile-media.storage.port';

function fakes(owns: (url: string) => boolean) {
  const calls: Array<[string, ProfileCardPatch]> = [];
  const cards: ProfileCardRepository = {
    upsert: async (accountId, patch) => {
      calls.push([accountId, patch]);
    },
  };
  const storage: ProfileMediaStoragePort = {
    ownsPublicUrl: owns,
    createUploadTarget: async (_a: string, _k: ProfileMediaKind): Promise<UploadTargetDto> => ({
      uploadUrl: 'u',
      publicUrl: 'p',
      path: 'x',
    }),
  };
  return { calls, cards, storage };
}

test('rechaza una foto que no es de nuestro Storage', async () => {
  const { cards, storage } = fakes(() => false);
  const uc = new UpdateProfileCardUseCase(cards, storage);
  await assert.rejects(() => uc.execute('acc', { photoUrl: 'https://evil.example/x.png' }), /almacenamiento/);
});

test('acepta privacidad y limpiar portada (null) sin tocar el Storage', async () => {
  const { calls, cards, storage } = fakes(() => true);
  const uc = new UpdateProfileCardUseCase(cards, storage);
  await uc.execute('acc', { isPrivate: true, coverUrl: null });
  assert.deepEqual(calls, [['acc', { isPrivate: true, coverUrl: null }]]);
});

test('acepta una foto de nuestro Storage', async () => {
  const { calls, cards, storage } = fakes((u) => u.startsWith('https://ours/'));
  const uc = new UpdateProfileCardUseCase(cards, storage);
  await uc.execute('acc', { photoUrl: 'https://ours/profiles/acc/photo-1.png' });
  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.[1].photoUrl, 'https://ours/profiles/acc/photo-1.png');
});
