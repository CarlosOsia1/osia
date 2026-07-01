'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import {
  Avatar,
  Card,
  ConfirmDialog,
  MediaGallery,
  Menu,
  ReactionBar,
  Text,
  IconComment,
  IconMore,
  IconTrash,
  type MenuItem,
} from '@osia/ui';
import type { PostDto } from '@osia/shared';
import { deletePost, removeReaction, setReaction } from '../../lib/social-api';
import { relativeTime } from '../../lib/time';
import { CommentThread } from './CommentThread';
import { ReactionListModal } from './ReactionListModal';

/**
 * PostCard (S3.10) — la tarjeta de post de lujo: autor + tiempo + menú (borrar el propio), cuerpo,
 * media (foto/video), reacciones celestiales (★☾☀, una por post) con lista de "quién reaccionó", y
 * comentarios inline plegables. Reutilizada en el feed y en el detalle. `onMutated` refresca el feed
 * tras reaccionar/comentar/borrar. Compone @osia/ui + i18n (§2.1).
 */
export function PostCard({
  post,
  viewerHandle,
  onMutated,
  defaultShowComments = false,
}: {
  post: PostDto;
  viewerHandle: string | null;
  onMutated?: () => void;
  defaultShowComments?: boolean;
}) {
  const t = useTranslations('social');
  const locale = useLocale();
  const [showComments, setShowComments] = useState(defaultShowComments);
  const [showReactors, setShowReactors] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isOwn = viewerHandle !== null && post.author.handle === viewerHandle;

  const react = useMutation({
    mutationFn: async () => {
      if (post.viewerReaction === 'star') await removeReaction(post.id, 'star');
      else await setReaction(post.id, 'star');
    },
    onSuccess: () => onMutated?.(),
  });
  const del = useMutation({
    mutationFn: () => deletePost(post.id),
    onSuccess: () => {
      setConfirmDelete(false);
      onMutated?.();
    },
  });

  const menuItems: MenuItem[] = isOwn
    ? [{ key: 'delete', label: t('post.delete'), icon: <IconTrash />, onClick: () => setConfirmDelete(true), danger: true }]
    : [];

  return (
    <Card pad>
      <article className="osia-post">
        <div className="osia-post__head">
          <Link href={`/profile/${post.author.handle}`} className="osia-post__author">
            <Avatar src={post.author.avatarUrl} name={post.author.displayName} size={40} />
            <span className="osia-post__names">
              <Text variant="subheading" as="span">
                {post.author.displayName}
              </Text>
              <Text variant="meta" tone="subtle">
                {`@${post.author.handle} · ${relativeTime(post.createdAt, locale)}`}
              </Text>
            </span>
          </Link>
          {menuItems.length > 0 && (
            <span className="osia-post__menu">
              <Menu label={t('post.more')} items={menuItems} triggerClassName="osia-iconbtn">
                <IconMore />
              </Menu>
            </span>
          )}
        </div>

        {post.body && (
          <Text variant="read" className="osia-post__body">
            {post.body}
          </Text>
        )}
        {post.media.length > 0 && <MediaGallery media={post.media} />}

        <div className="osia-post__actions">
          <ReactionBar
            reacted={post.viewerReaction === 'star'}
            count={post.reactionCount}
            onToggle={() => react.mutate()}
            onShowReactors={() => setShowReactors(true)}
            label={t('post.like')}
            countLabel={t('post.reactions', { count: post.reactionCount })}
            pending={react.isPending}
          />
          <button
            type="button"
            className="osia-reactbtn"
            aria-expanded={showComments}
            onClick={() => setShowComments((s) => !s)}
          >
            <IconComment />
            {t('post.comments', { count: post.commentCount })}
          </button>
        </div>

        {showComments && (
          <div className="osia-post__comments">
            <CommentThread postId={post.id} viewerHandle={viewerHandle} onMutated={onMutated} />
          </div>
        )}
      </article>

      {showReactors && <ReactionListModal postId={post.id} onClose={() => setShowReactors(false)} />}
      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => del.mutate()}
        title={t('post.deleteTitle')}
        message={t('post.deleteBody')}
        confirmLabel={t('post.delete')}
        cancelLabel={t('edit.cancel')}
        danger
        loading={del.isPending}
      />
    </Card>
  );
}
