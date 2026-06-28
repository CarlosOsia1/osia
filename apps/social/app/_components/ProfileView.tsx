'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Button, Card, PopularityMeter, Text } from '@osia/ui';
import { useOsiaSession } from '@osia/identity';
import { identity } from '../../lib/identity';
import { followAccount, getProfilePosts, getPublicProfile, unfollowAccount } from '../../lib/social-api';

/**
 * Perfil público (S3.5-H1): cabecera + `PopularityMeter` (estatus) + conteos + seguir/dejar de seguir +
 * los posts del perfil (visibles para el lector). Texto vía `Text`/i18n, tokens (§2.1). El SessionGuard
 * (que envuelve la página) garantiza sesión; aquí solo se lee y se compone.
 */
export function ProfileView({ handle }: { handle: string }) {
  const t = useTranslations('social');
  const qc = useQueryClient();
  const viewerHandle = useOsiaSession(identity).data?.passport?.profile?.handle ?? null;

  const profileQ = useQuery({ queryKey: ['social', 'profile', handle], queryFn: () => getPublicProfile(handle) });
  const postsQ = useQuery({
    queryKey: ['social', 'profile', handle, 'posts'],
    queryFn: () => getProfilePosts(handle),
    enabled: profileQ.isSuccess,
  });

  const follow = useMutation({
    mutationFn: async () => {
      const p = profileQ.data;
      if (!p) return;
      if (p.isFollowing) await unfollowAccount(p.accountId);
      else await followAccount(p.accountId);
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['social', 'profile', handle] }),
  });

  if (profileQ.isPending) return <Text tone="muted">{t('profile.loading')}</Text>;
  if (profileQ.isError || !profileQ.data) return <Text tone="muted">{t('profile.notFound')}</Text>;

  const profile = profileQ.data;
  const isSelf = viewerHandle === profile.handle;
  const posts = postsQ.data?.data ?? [];

  return (
    <div style={{ display: 'grid', gap: 'var(--space-5)' }}>
      <header style={{ display: 'grid', gap: 'var(--space-2)' }}>
        <Text variant="display">{profile.displayName}</Text>
        <Text variant="label" tone="subtle">{`@${profile.handle}`}</Text>
        {profile.bio && <Text variant="body">{profile.bio}</Text>}
        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <Text variant="label" tone="muted">{t('profile.followers', { count: profile.followersCount })}</Text>
          <Text variant="label" tone="muted">{t('profile.following', { count: profile.followingCount })}</Text>
        </div>
        <PopularityMeter points={profile.popularityPoints} label={t('profile.popularity')} />
        {!isSelf && (
          <div style={{ justifySelf: 'start' }}>
            <Button
              variant={profile.isFollowing ? 'ghost' : 'primary'}
              active={profile.isFollowing}
              loading={follow.isPending}
              onClick={() => follow.mutate()}
            >
              {profile.isFollowing ? t('profile.unfollow') : t('profile.follow')}
            </Button>
          </div>
        )}
      </header>

      <section style={{ display: 'grid', gap: 'var(--space-3)' }}>
        <Text variant="title">{t('profile.posts')}</Text>
        {posts.length === 0 ? (
          <Text variant="label" tone="muted">
            {t('profile.noPosts')}
          </Text>
        ) : (
          posts.map((post) => (
            <Card key={post.id} pad>
              <article style={{ display: 'grid', gap: 'var(--space-2)' }}>
                {post.body && <Text variant="body">{post.body}</Text>}
                {post.media.map((url) => (
                  <img key={url} src={url} alt="" style={{ maxWidth: '100%', borderRadius: 'var(--radius-2, 8px)' }} />
                ))}
                <Text variant="label" tone="subtle">
                  {`${t('feed.star', { count: post.reactionCount })} · ${t('feed.comments', { count: post.commentCount })}`}
                </Text>
              </article>
            </Card>
          ))
        )}
      </section>
    </div>
  );
}
