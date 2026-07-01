'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { Avatar, Button, ConfirmDialog, Field, Menu, Text, IconMore, IconTrash, type MenuItem } from '@osia/ui';
import { COMMENT_BODY_MAX, type CommentDto, type Page } from '@osia/shared';
import { createComment, deleteComment, getPostComments } from '../../lib/social-api';
import { relativeTime } from '../../lib/time';

/**
 * CommentThread (S3.10) — comentarios inline de un post (estilo Facebook): composer arriba + lista
 * paginada. Borrar el propio con confirmación. Al cambiar, invalida el hilo y avisa (`onMutated`) para
 * refrescar el conteo del feed. Compone @osia/ui + i18n.
 */
export function CommentThread({
  postId,
  viewerHandle,
  onMutated,
}: {
  postId: string;
  viewerHandle: string | null;
  onMutated?: () => void;
}) {
  const t = useTranslations('social');
  const locale = useLocale();
  const qc = useQueryClient();
  const key = ['social', 'comments', postId] as const;
  const [text, setText] = useState('');
  const [toDelete, setToDelete] = useState<string | null>(null);

  const q = useInfiniteQuery({
    queryKey: key,
    queryFn: ({ pageParam }) => getPostComments(postId, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (l: Page<CommentDto>) => l.page.nextCursor ?? undefined,
  });
  const add = useMutation({
    mutationFn: () => createComment(postId, { body: text.trim() }),
    onSuccess: () => {
      setText('');
      void qc.invalidateQueries({ queryKey: key });
      onMutated?.();
    },
  });
  const del = useMutation({
    mutationFn: (id: string) => deleteComment(id),
    onSuccess: () => {
      setToDelete(null);
      void qc.invalidateQueries({ queryKey: key });
      onMutated?.();
    },
  });

  const comments = q.data?.pages.flatMap((p) => p.data) ?? [];
  const canSend = text.trim().length > 0 && !add.isPending;

  return (
    <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
      <div className="osia-comment__composer">
        <Field
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t('post.commentPlaceholder')}
          maxLength={COMMENT_BODY_MAX}
          aria-label={t('post.commentPlaceholder')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && canSend) {
              e.preventDefault();
              add.mutate();
            }
          }}
        />
        <Button size="sm" variant="primary" loading={add.isPending} disabled={!canSend} onClick={() => add.mutate()}>
          {t('post.commentSend')}
        </Button>
      </div>

      {q.isPending ? (
        <Text variant="meta" tone="muted">
          {t('post.commentsLoading')}
        </Text>
      ) : comments.length === 0 ? (
        <Text variant="meta" tone="muted">
          {t('post.noComments')}
        </Text>
      ) : (
        comments.map((c) => (
          <div key={c.id} className="osia-comment">
            <Avatar src={c.author.avatarUrl} name={c.author.displayName} size={32} />
            <div className="osia-comment__bubble">
              <div className="osia-comment__meta">
                <Link href={`/profile/${c.author.handle}`} style={{ textDecoration: 'none' }}>
                  <Text variant="caption" tone="accent" as="span">
                    {c.author.displayName}
                  </Text>
                </Link>
                <Text variant="meta" tone="subtle">
                  {relativeTime(c.createdAt, locale)}
                </Text>
                {viewerHandle === c.author.handle && (
                  <span style={{ marginInlineStart: 'auto' }}>
                    <Menu
                      label={t('post.more')}
                      triggerClassName="osia-iconbtn osia-iconbtn--sm"
                      items={
                        [
                          {
                            key: 'delete',
                            label: t('post.deleteComment'),
                            icon: <IconTrash />,
                            onClick: () => setToDelete(c.id),
                            danger: true,
                          },
                        ] satisfies MenuItem[]
                      }
                    >
                      <IconMore />
                    </Menu>
                  </span>
                )}
              </div>
              <Text variant="read">{c.body}</Text>
            </div>
          </div>
        ))
      )}

      {q.hasNextPage && (
        <Button variant="ghost" size="sm" loading={q.isFetchingNextPage} onClick={() => void q.fetchNextPage()}>
          {t('post.moreComments')}
        </Button>
      )}

      <ConfirmDialog
        open={toDelete !== null}
        onClose={() => setToDelete(null)}
        onConfirm={() => toDelete && del.mutate(toDelete)}
        title={t('post.deleteCommentTitle')}
        message={t('post.deleteCommentBody')}
        confirmLabel={t('post.delete')}
        cancelLabel={t('edit.cancel')}
        danger
        loading={del.isPending}
      />
    </div>
  );
}
