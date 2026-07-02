'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import {
  Avatar,
  Button,
  ConfirmDialog,
  Menu,
  Text,
  IconFlag,
  IconMore,
  IconPencil,
  IconTrash,
  useToast,
  type MenuItem,
} from '@osia/ui';
import { COMMENT_BODY_MAX, type CommentDto, type CommentId, type Page } from '@osia/shared';
import { createComment, deleteComment, getPostComments, updateComment } from '../../lib/api';
import { queryKeys } from '../../lib/query-keys';
import { routes } from '../../lib/routes';
import { relativeTime } from '../../lib/time';
import { MentionTextarea } from './MentionTextarea';
import { ReportDialog } from './ReportDialog';
import { RichBody } from './RichBody';

/**
 * CommentThread (R3) — la conversación de un post, con HILOS de 1 nivel (estilo Instagram; el
 * backend ya guardaba `parentCommentId`, la UI por fin lo honra): raíces + respuestas indentadas
 * y colapsadas («Ver N respuestas»), «Responder» que prellena la mención, composer con
 * autocompletado de `@handle`, menciones navegables (`RichBody`), borrar lo propio y reportar
 * lo ajeno. El orden ASC del servidor garantiza que toda respuesta llega DESPUÉS de su raíz.
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
  const toast = useToast();
  const qc = useQueryClient();
  const key = queryKeys.comments(postId);
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<CommentDto | null>(null);
  const [toDelete, setToDelete] = useState<string | null>(null);
  const [toReport, setToReport] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());

  const q = useInfiniteQuery({
    queryKey: key,
    queryFn: ({ pageParam }) => getPostComments(postId, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (l: Page<CommentDto>) => l.page.nextCursor ?? undefined,
  });
  const add = useMutation({
    mutationFn: () =>
      createComment(postId, {
        body: text.trim(),
        ...(replyTo ? { parentCommentId: replyTo.id } : {}),
      }),
    onSuccess: (comment) => {
      setText('');
      // La respuesta recién enviada se muestra desplegada (que se vea el eco propio).
      if (comment.parentCommentId) {
        setExpanded((s) => new Set(s).add(comment.parentCommentId as string));
      }
      setReplyTo(null);
      void qc.invalidateQueries({ queryKey: key });
      onMutated?.();
    },
    onError: () => toast.error(t('post.commentError')),
  });
  const del = useMutation({
    mutationFn: (id: string) => deleteComment(id),
    onSuccess: () => {
      setToDelete(null);
      void qc.invalidateQueries({ queryKey: key });
      onMutated?.();
    },
    onError: () => toast.error(t('errors.delete')),
  });
  // Editar (R4): guarda el cuerpo nuevo y refresca el hilo; marca «editado».
  const edit = useMutation({
    mutationFn: (id: string) => updateComment(id, { body: editDraft.trim() }),
    onSuccess: () => {
      setEditingId(null);
      void qc.invalidateQueries({ queryKey: key });
    },
    onError: () => toast.error(t('post.editError')),
  });
  const canSaveEdit = editDraft.trim().length > 0 && !edit.isPending;

  const comments = q.data?.pages.flatMap((p) => p.data) ?? [];
  // Hilos de 1 nivel: raíces en orden + respuestas agrupadas bajo su raíz (subset cargado).
  const { roots, replies } = useMemo(() => {
    const rootList: CommentDto[] = [];
    const replyMap = new Map<string, CommentDto[]>();
    for (const c of comments) {
      if (c.parentCommentId === null) {
        rootList.push(c);
      } else {
        const bucket = replyMap.get(c.parentCommentId) ?? [];
        bucket.push(c);
        replyMap.set(c.parentCommentId, bucket);
      }
    }
    return { roots: rootList, replies: replyMap };
  }, [comments]);

  const canSend = text.trim().length > 0 && !add.isPending;

  function startReply(c: CommentDto): void {
    setReplyTo(c);
    setText(`@${c.author.handle} `);
  }

  function toggleReplies(rootId: CommentId): void {
    setExpanded((s) => {
      const next = new Set(s);
      if (next.has(rootId)) next.delete(rootId);
      else next.add(rootId);
      return next;
    });
  }

  function menuFor(c: CommentDto): MenuItem[] {
    if (viewerHandle === c.author.handle) {
      return [
        {
          key: 'edit',
          label: t('post.edit'),
          icon: <IconPencil />,
          onClick: () => {
            setEditDraft(c.body);
            setEditingId(c.id);
          },
        },
        {
          key: 'delete',
          label: t('post.deleteComment'),
          icon: <IconTrash />,
          onClick: () => setToDelete(c.id),
          danger: true,
        },
      ];
    }
    return [
      { key: 'report', label: t('report.action'), icon: <IconFlag />, onClick: () => setToReport(c.id) },
    ];
  }

  function renderComment(c: CommentDto, isRoot: boolean) {
    const kids = replies.get(c.id) ?? [];
    const open = expanded.has(c.id);
    return (
      <div key={c.id} className="osia-comment" data-reply={!isRoot || undefined}>
        <Avatar src={c.author.avatarUrl} name={c.author.displayName} size={isRoot ? 32 : 26} />
        <div className="osia-comment__bubble">
          <div className="osia-comment__meta">
            <Link href={routes.perfil(c.author.handle)} className="osia-comment__author">
              <Text variant="caption" tone="accent" as="span">
                {c.author.displayName}
              </Text>
            </Link>
            <Text variant="meta" tone="subtle">
              {`${relativeTime(c.createdAt, locale)}${c.editedAt ? ` · ${t('post.edited')}` : ''}`}
            </Text>
            <span className="osia-comment__menu">
              <Menu label={t('post.more')} triggerClassName="osia-iconbtn osia-iconbtn--sm" items={menuFor(c)}>
                <IconMore />
              </Menu>
            </span>
          </div>
          {editingId === c.id ? (
            <div className="osia-composer__field">
              <MentionTextarea
                value={editDraft}
                onChange={setEditDraft}
                ariaLabel={t('post.edit')}
                maxLength={COMMENT_BODY_MAX}
                autoFocus
                onSubmit={() => {
                  if (canSaveEdit) edit.mutate(c.id);
                }}
              />
              <div className="osia-composer__row">
                <Button size="sm" variant="primary" disabled={!canSaveEdit} loading={edit.isPending} onClick={() => edit.mutate(c.id)}>
                  {t('edit.save')}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                  {t('edit.cancel')}
                </Button>
              </div>
            </div>
          ) : (
            <RichBody text={c.body} variant="read" />
          )}
          <div className="osia-comment__actions">
            {isRoot && (
              <button type="button" className="osia-comment__action" onClick={() => startReply(c)}>
                {t('post.reply')}
              </button>
            )}
            {isRoot && kids.length > 0 && (
              <button type="button" className="osia-comment__action" onClick={() => toggleReplies(c.id)}>
                {open ? t('post.hideReplies') : t('post.showReplies', { count: kids.length })}
              </button>
            )}
          </div>
          {isRoot && open && kids.length > 0 && (
            <div className="osia-comment__replies">{kids.map((k) => renderComment(k, false))}</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="osia-thread">
      <div className="osia-comment__composer">
        <div className="osia-thread__box">
          {replyTo && (
            <div className="osia-thread__replying">
              <Text variant="caption" tone="subtle" as="span">
                {t('post.replyingTo', { name: replyTo.author.displayName })}
              </Text>
              <Button size="sm" variant="ghost" onClick={() => setReplyTo(null)}>
                {t('edit.cancel')}
              </Button>
            </div>
          )}
          <MentionTextarea
            value={text}
            onChange={setText}
            ariaLabel={t('post.commentPlaceholder')}
            placeholder={t('post.commentPlaceholder')}
            maxLength={COMMENT_BODY_MAX}
            onSubmit={() => {
              if (canSend) add.mutate();
            }}
          />
        </div>
        <Button size="sm" variant="primary" loading={add.isPending} disabled={!canSend} onClick={() => add.mutate()}>
          {t('post.commentSend')}
        </Button>
      </div>

      {q.isPending ? (
        <Text variant="meta" tone="muted">
          {t('post.commentsLoading')}
        </Text>
      ) : roots.length === 0 ? (
        <Text variant="meta" tone="muted">
          {t('post.noComments')}
        </Text>
      ) : (
        roots.map((c) => renderComment(c, true))
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
      {toReport && <ReportDialog targetType="comment" targetId={toReport} onClose={() => setToReport(null)} />}
    </div>
  );
}
