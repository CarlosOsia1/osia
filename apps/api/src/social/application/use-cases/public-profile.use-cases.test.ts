/**
 * Perfil público (S3.5-H1) — GetPublicProfile y ListProfilePosts: devuelven lo del repo o 404 si null.
 * Fakes del puerto.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  asAccountId,
  asProfileId,
  ErrorCode,
  type Page,
  type PostDto,
  type PublicProfileDto,
} from '@osia/shared';
import { GetPublicProfileUseCase } from './get-public-profile.use-case';
import { ListProfilePostsUseCase } from './list-profile-posts.use-case';
import type { ProfileQueryPort } from '../ports/out/profile.query';
import type { PostMediaSigner } from '../post-media-signer.service';
import { AppException } from '../../../common/app-exception';

const fakeMediaSigner = { signPost: async () => {}, signPosts: async () => {} } as unknown as PostMediaSigner;

const VIEWER = '0190b8e0-7c1e-7b3a-8a4e-000000000001';
const profile: PublicProfileDto = {
  profileId: asProfileId('0190b8e0-7c1e-7b3a-8a4e-0000000000aa'),
  accountId: asAccountId('0190b8e0-7c1e-7b3a-8a4e-000000000002'),
  handle: 'ariadna',
  displayName: 'Ariadna',
  avatarUrl: null,
  accentColor: '#CBB89A',
  popularityPoints: 5,
  bio: null,
  reputation: 5,
  followersCount: 1,
  followingCount: 0,
  isFollowing: true,
  isPrivate: false,
  photoUrl: null,
  coverUrl: null,
  viewerState: 'following',
  canViewContent: true,
  blockedByViewer: false,
  mutedByViewer: false,
};
const emptyPage: Page<PostDto> = { data: [], page: { nextCursor: null, hasMore: false, limit: 20 } };

const port = (over: Partial<ProfileQueryPort> = {}): ProfileQueryPort => ({
  getPublicProfile: async () => profile,
  listProfilePosts: async () => emptyPage,
  ...over,
});

test('getPublicProfile: devuelve el perfil', async () => {
  const res = await new GetPublicProfileUseCase(port()).execute('ariadna', VIEWER);
  assert.equal(res.handle, 'ariadna');
  assert.equal(res.isFollowing, true);
});

test('getPublicProfile: handle inexistente → NOT_FOUND (404)', async () => {
  const uc = new GetPublicProfileUseCase(port({ getPublicProfile: async () => null }));
  await assert.rejects(
    () => uc.execute('nadie', VIEWER),
    (e: unknown) => e instanceof AppException && e.code === ErrorCode.NOT_FOUND && e.status === 404,
  );
});

test('listProfilePosts: devuelve la página; handle inexistente → 404', async () => {
  assert.deepEqual((await new ListProfilePostsUseCase(port(), fakeMediaSigner).execute('ariadna', VIEWER, {})).data, []);
  const uc = new ListProfilePostsUseCase(port({ listProfilePosts: async () => null }), fakeMediaSigner);
  await assert.rejects(
    () => uc.execute('nadie', VIEWER, {}),
    (e: unknown) => e instanceof AppException && e.code === ErrorCode.NOT_FOUND && e.status === 404,
  );
});
