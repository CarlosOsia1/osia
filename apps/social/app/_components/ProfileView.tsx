'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import {
  Avatar,
  Button,
  ConfirmDialog,
  Divider,
  ErrorState,
  IconButton,
  Menu,
  Skeleton,
  Text,
  IconComment,
  IconLock,
  IconMore,
  IconShare,
  IconStar,
  useToast,
  type MenuItem,
} from '@osia/ui';
import type { PostDto } from '@osia/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  blockAccount,
  getPresence,
  openConversation,
  getProfilePosts,
  getPublicProfile,
  muteAccount,
  unblockAccount,
  unmuteAccount,
} from '../../lib/api';
import { queryKeys } from '../../lib/query-keys';
import { routes } from '../../lib/routes';
import { shareUrl } from '../../lib/share';
import { useToggleFollow } from '../../lib/mutations/follows';
import { ProfileEditModal } from './ProfileEditModal';

const profileKey = (handle: string) => ['social', 'profile', handle] as const;

/**
 * ProfileView (S3.8) — perfil de lujo estilo Instagram: portada + foto solapada + nombre + bio + conteos
 * + medidor de popularidad. Editable si es tuyo; seguir/solicitar si es ajeno. Gating estricto: una cuenta
 * privada de la que no eres dueño ni seguidor muestra solo la cabecera + candado. Compone @osia/ui (§2.1).
 */
export function ProfileView({ handle }: { handle: string }) {
  const t = useTranslations('social');
  const toast = useToast();
  const qc = useQueryClient();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [confirmBlock, setConfirmBlock] = useState(false);

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

  // Optimista (R1): el CTA y el conteo cambian al instante; rollback + toast si el API falla.
  // El botón solo se pinta con perfil cargado y ajeno, así que los defaults nunca llegan a red.
  const viewerState = profileQ.data?.viewerState;
  const follow = useToggleFollow({
    accountId: profileQ.data?.accountId ?? '',
    viewerState: viewerState === 'self' || viewerState === undefined ? 'none' : viewerState,
    isPrivate: profileQ.data?.isPrivate,
  });

  // Control del propio espacio (R4.4): silenciar es discreto; bloquear pide confirmación.
  const invalidateProfile = (): void => {
    void qc.invalidateQueries({ queryKey: ['social', 'profile'] });
    void qc.invalidateQueries({ queryKey: queryKeys.feed });
  };
  const muteM = useMutation({
    mutationFn: async () => {
      const p = profileQ.data;
      if (!p) return;
      if (p.mutedByViewer) await unmuteAccount(p.accountId);
      else await muteAccount(p.accountId);
    },
    onSuccess: () => {
      toast.success(profileQ.data?.mutedByViewer ? t('moderation.unmuted') : t('moderation.muted'));
      invalidateProfile();
    },
    onError: () => toast.error(t('errors.loadTitle')),
  });
  const blockM = useMutation({
    mutationFn: async () => {
      const p = profileQ.data;
      if (!p) return;
      if (p.blockedByViewer) await unblockAccount(p.accountId);
      else await blockAccount(p.accountId);
    },
    onSuccess: () => {
      setConfirmBlock(false);
      toast.success(profileQ.data?.blockedByViewer ? t('moderation.unblocked') : t('moderation.blocked'));
      invalidateProfile();
    },
    onError: () => toast.error(t('errors.loadTitle')),
  });
  // Mensaje directo (R5): abre (o recupera) la conversación y aterriza en el hilo.
  const openDm = useMutation({
    mutationFn: async () => {
      const p = profileQ.data;
      if (!p) throw new Error('perfil sin cargar');
      return openConversation(p.accountId);
    },
    onSuccess: (conversation) => {
      router.push(`${routes.mensajes}?con=${conversation.id}`);
    },
    onError: () => toast.error(t('dm.openError')),
  });

  if (profileQ.isPending) return <ProfileSkeleton />;
  if (profileQ.isError || !profileQ.data) {
    return (
      <ErrorState
        title={t('profile.notFound')}
        description={t('errors.loadBody')}
        action={
          <Button variant="secondary" onClick={() => void profileQ.refetch()}>
            {t('retry')}
          </Button>
        }
      />
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
          <IconButton
            label={t('share.profile')}
            onClick={() => {
              void shareUrl(routes.perfil(p.handle), `${p.displayName} · OSIA`).then((outcome) => {
                if (outcome === 'copied') toast.success(t('share.copied'));
                else if (outcome === 'failed') toast.error(t('share.error'));
              });
            }}
          >
            <IconShare />
          </IconButton>
          {!isSelf && (
            <Menu
              label={t('post.more')}
              triggerClassName="osia-iconbtn"
              items={
                [
                  {
                    key: 'mute',
                    label: p.mutedByViewer ? t('moderation.unmute') : t('moderation.mute'),
                    onClick: () => muteM.mutate(),
                  },
                  {
                    key: 'block',
                    label: p.blockedByViewer ? t('moderation.unblock') : t('moderation.block'),
                    danger: !p.blockedByViewer,
                    onClick: () => (p.blockedByViewer ? blockM.mutate() : setConfirmBlock(true)),
                  },
                ] satisfies MenuItem[]
              }
            >
              <IconMore />
            </Menu>
          )}
          {!isSelf && !p.blockedByViewer && (
            <Button
              variant="secondary"
              loading={openDm.isPending}
              onClick={() => openDm.mutate()}
            >
              {t('dm.message')}
            </Button>
          )}
          {isSelf ? (
            <Button variant="secondary" onClick={() => setEditing(true)}>
              {t('profile.edit')}
            </Button>
          ) : p.blockedByViewer ? (
            <Button variant="secondary" loading={blockM.isPending} onClick={() => blockM.mutate()}>
              {t('moderation.unblock')}
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
      <ConfirmDialog
        open={confirmBlock}
        onClose={() => setConfirmBlock(false)}
        onConfirm={() => blockM.mutate()}
        title={t('moderation.blockTitle', { name: p.displayName })}
        message={t('moderation.blockBody')}
        confirmLabel={t('moderation.block')}
        cancelLabel={t('edit.cancel')}
        danger
        loading={blockM.isPending}
      />
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
      <Text variant="read" tone="muted" className="osia-profile__noposts">
        {emptyLabel}
      </Text>
    );
  }
  return (
    <div className="osia-profile__grid">
      {posts.map((post) => {
        const first = post.media[0];
        return (
          <Link key={post.id} href={routes.publicacion(post.id)} className="osia-profile__tile">
            {first ? (
              first.kind === 'video' ? (
                <video className="osia-profile__tilemedia" src={first.url} muted preload="metadata" />
              ) : (
                <img className="osia-profile__tilemedia" src={first.url} alt="" loading="lazy" />
              )
            ) : (
              <Text variant="read" tone="muted">
                {post.body}
              </Text>
            )}
            {/* Al posar: los contadores respiran sobre la pieza (R3). */}
            <span className="osia-profile__tileveil" aria-hidden="true">
              <span className="osia-profile__tilestat">
                <IconStar />
                <Text variant="meta" as="span">
                  {post.reactionCount}
                </Text>
              </span>
              <span className="osia-profile__tilestat">
                <IconComment />
                <Text variant="meta" as="span">
                  {post.commentCount}
                </Text>
              </span>
            </span>
          </Link>
        );
      })}
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
