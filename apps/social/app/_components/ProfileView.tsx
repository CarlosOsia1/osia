'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import {
  Avatar,
  Button,
  Card,
  Divider,
  PopularityMeter,
  Skeleton,
  Text,
  IconLock,
} from '@osia/ui';
import type { PostDto } from '@osia/shared';
import {
  followAccount,
  getPresence,
  getProfilePosts,
  getPublicProfile,
  unfollowAccount,
} from '../../lib/social-api';
import { ProfileEditModal } from './ProfileEditModal';

const profileKey = (handle: string) => ['social', 'profile', handle] as const;

/**
 * ProfileView (S3.8) — perfil de lujo estilo Instagram: portada + foto solapada + nombre + bio + conteos
 * + medidor de popularidad. Editable si es tuyo; seguir/solicitar si es ajeno. Gating estricto: una cuenta
 * privada de la que no eres dueño ni seguidor muestra solo la cabecera + candado. Compone @osia/ui (§2.1).
 */
export function ProfileView({ handle }: { handle: string }) {
  const t = useTranslations('social');
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);

  const profileQ = useQuery({ queryKey: profileKey(handle), queryFn: () => getPublicProfile(handle) });
  const canView = profileQ.data?.canViewContent ?? false;
  const postsQ = useQuery({
    queryKey: [...profileKey(handle), 'posts'],
    queryFn: () => getProfilePosts(handle),
    enabled: profileQ.isSuccess && canView,
  });

  // Presencia direccional (S3.9): el backend solo devuelve el estado si ESTE perfil te sigue; para tu
  // propio perfil no consultamos. `en línea` = alguna sesión abierta.
  const accountId = profileQ.data?.accountId;
  const presenceQ = useQuery({
    queryKey: ['social', 'presence', accountId],
    queryFn: () => getPresence(accountId ? [accountId] : []),
    enabled: !!accountId && profileQ.data?.viewerState !== 'self',
    refetchInterval: 60_000,
  });

  const follow = useMutation({
    mutationFn: async () => {
      const p = profileQ.data;
      if (!p) return;
      if (p.viewerState === 'following') await unfollowAccount(p.accountId);
      else await followAccount(p.accountId);
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: profileKey(handle) }),
  });

  if (profileQ.isPending) return <ProfileSkeleton />;
  if (profileQ.isError || !profileQ.data) {
    return (
      <Text variant="read" tone="muted">
        {t('profile.notFound')}
      </Text>
    );
  }

  const p = profileQ.data;
  const isSelf = p.viewerState === 'self';
  const photo = p.photoUrl ?? p.avatarUrl;
  const posts = postsQ.data?.data ?? [];
  const online = presenceQ.data?.some((e) => e.online) ?? false;

  const followLabel =
    p.viewerState === 'following'
      ? t('profile.followingState')
      : p.viewerState === 'requested'
        ? t('profile.requested')
        : p.isPrivate
          ? t('profile.requestFollow')
          : t('profile.follow');

  return (
    <div className="osia-profile">
      <div className="osia-profile__cover">{p.coverUrl && <img src={p.coverUrl} alt="" />}</div>

      <div className="osia-profile__id">
        <span className="osia-profile__photo">
          <Avatar
            src={photo}
            name={p.displayName}
            size={112}
            ring
            presence={online ? 'online' : undefined}
          />
        </span>
        <div className="osia-profile__names">
          <Text variant="hero" as="h1">
            {p.displayName}
          </Text>
          <Text variant="meta" tone="subtle">
            {`@${p.handle}`}
          </Text>
        </div>
        <div className="osia-profile__actions">
          {isSelf ? (
            <Button variant="secondary" onClick={() => setEditing(true)}>
              {t('profile.edit')}
            </Button>
          ) : (
            <Button
              variant={p.viewerState === 'following' ? 'ghost' : 'primary'}
              active={p.viewerState === 'following'}
              loading={follow.isPending}
              onClick={() => follow.mutate()}
            >
              {followLabel}
            </Button>
          )}
        </div>
      </div>

      {p.bio && (
        <Text variant="read" className="osia-profile__bio">
          {p.bio}
        </Text>
      )}

      <div className="osia-profile__stats">
        <span className="osia-profile__stat">
          <Text variant="subheading" as="span">
            {p.followersCount}
          </Text>
          <Text variant="meta" tone="muted">
            {t('profile.followersLabel')}
          </Text>
        </span>
        <span className="osia-profile__stat">
          <Text variant="subheading" as="span">
            {p.followingCount}
          </Text>
          <Text variant="meta" tone="muted">
            {t('profile.followingLabel')}
          </Text>
        </span>
      </div>

      <div style={{ paddingInline: 'var(--space-4)' }}>
        <PopularityMeter points={p.popularityPoints} label={t('profile.popularity')} />
      </div>

      <Divider />

      {canView ? (
        <ProfilePosts posts={posts} loading={postsQ.isPending} emptyLabel={t('profile.noPosts')} />
      ) : (
        <div className="osia-profile__locked">
          <IconLock />
          <Text variant="subheading">{t('profile.privateTitle')}</Text>
          <Text variant="read" tone="muted">
            {t('profile.privateBody')}
          </Text>
        </div>
      )}

      {isSelf && <ProfileEditModal open={editing} onClose={() => setEditing(false)} profile={p} />}
    </div>
  );
}



/** Rejilla de posts del perfil (S3.8): miniatura de media o extracto de texto. El detalle llega en S3.10. */
function ProfilePosts({
  posts,
  loading,
  emptyLabel,
}: {
  posts: PostDto[];
  loading: boolean;
  emptyLabel: string;
}) {
  if (loading) {
    return (
      <div className="osia-profile__grid">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} variant="block" width="100%" height={undefined} className="osia-profile__tile" />
        ))}
      </div>
    );
  }
  if (posts.length === 0) {
    return (
      <Text variant="read" tone="muted" style={{ paddingInline: 'var(--space-4)' }}>
        {emptyLabel}
      </Text>
    );
  }
  return (
    <div className="osia-profile__grid">
      {posts.map((post) => (
        <Card key={post.id} className="osia-profile__tile">
          {post.media[0] ? (
            <img
              src={post.media[0]}
              alt=""
              style={{ inlineSize: '100%', blockSize: '100%', objectFit: 'cover' }}
            />
          ) : (
            <Text variant="read" tone="muted">
              {post.body}
            </Text>
          )}
        </Card>
      ))}
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="osia-profile">
      <Skeleton variant="block" width="100%" height="9rem" />
      <div className="osia-profile__id">
        <span className="osia-profile__photo">
          <Skeleton variant="circle" width={112} height={112} />
        </span>
        <div className="osia-profile__names" style={{ gap: 'var(--space-2)' }}>
          <Skeleton variant="text" width="12rem" height="1.4rem" />
          <Skeleton variant="text" width="7rem" />
        </div>
      </div>
    </div>
  );
}
