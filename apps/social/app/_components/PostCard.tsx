'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import {
  Avatar,
  Button,
  Card,
  ConfirmDialog,
  HoverCard,
  Lightbox,
  MediaGallery,
  Menu,
  PopularityMeter,
  ReactionBar,
  Text,
  IconBookmark,
  IconComment,
  IconEcho,
  IconFlag,
  IconMore,
  IconPencil,
  IconShare,
  IconTrash,
  useToast,
  type MenuItem,
} from '@osia/ui';
import { POST_BODY_MAX, type EchoedPostDto, type PostDto, type ProfileBrief } from '@osia/shared';
import { deletePost, updatePost } from '../../lib/api';
import { patchPostInCaches } from '../../lib/mutations/patch';
import { routes } from '../../lib/routes';
import { shareUrl } from '../../lib/share';
import { useToggleBookmark } from '../../lib/mutations/bookmarks';
import { useToggleEcho } from '../../lib/mutations/echo';
import { useToggleReaction } from '../../lib/mutations/reactions';
import { relativeTime } from '../../lib/time';
import { CommentThread } from './CommentThread';
import { EchoDialog } from './EchoDialog';
import { MentionTextarea } from './MentionTextarea';
import { ReactionListModal } from './ReactionListModal';
import { ReportDialog } from './ReportDialog';
import { RichBody } from './RichBody';

/**
 * PostCard (S3.10) — la tarjeta de post de lujo: autor + tiempo + menú (borrar el propio), cuerpo,
 * media (foto/video), la estrella (reacción única, optimista desde R1) con lista de "quién
 * reaccionó", y comentarios inline plegables. Reutilizada en el feed y en el detalle. `onMutated`
 * refresca el feed tras comentar/borrar (la estrella ya no lo necesita: parchea los caches).
 * Compone @osia/ui + i18n (§2.1).
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
  const [reporting, setReporting] = useState(false);
  const [quoting, setQuoting] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const isOwn = viewerHandle !== null && post.author.handle === viewerHandle;

  const toast = useToast();
  const qc = useQueryClient();
  // Estrella optimista (R1): pinta al instante y reconcilia de fondo; ya no refetchea el feed.
  const react = useToggleReaction(post);
  // Guardar optimista (R4.2): colección privada del lector.
  const bookmark = useToggleBookmark(post);
  // Eco simple optimista (R4.3): amplificar/retirar; el quote va por EchoDialog.
  const echo = useToggleEcho(post);
  // Solo lo abierto se amplifica: público y de cuenta que el DTO no marca privada (el server re-verifica).
  const canEcho = !isOwn && (post.kind === 'echo' ? post.referencedPost !== null : post.visibility === 'public');
  const del = useMutation({
    mutationFn: () => deletePost(post.id),
    onSuccess: () => {
      setConfirmDelete(false);
      toast.success(t('post.deleted'));
      onMutated?.();
    },
    onError: () => toast.error(t('errors.delete')),
  });
  // Editar (R4): el DTO devuelto parchea los caches donde viva el post — sin refetch.
  const edit = useMutation({
    mutationFn: () => updatePost(post.id, { body: draft.trim() }),
    onSuccess: (updated) => {
      patchPostInCaches(qc, post.id, () => updated);
      setEditing(false);
      toast.success(t('post.editSaved'));
    },
    onError: () => toast.error(t('post.editError')),
  });
  const draftTooLong = draft.length > POST_BODY_MAX;
  const canSaveEdit = draft.trim().length > 0 && !draftTooLong && !edit.isPending;

  // Compartir (R3): Web Share nativo o portapapeles; el toast confirma sin estorbar.
  async function share(): Promise<void> {
    const outcome = await shareUrl(routes.publicacion(post.id), `${post.author.displayName} · OSIA`);
    if (outcome === 'copied') toast.success(t('share.copied'));
    else if (outcome === 'failed') toast.error(t('share.error'));
  }

  const menuItems: MenuItem[] = [
    { key: 'share', label: t('share.action'), icon: <IconShare />, onClick: () => void share() },
    ...(canEcho
      ? [
          {
            key: 'quote',
            label: t('echo.quote'),
            icon: <IconEcho />,
            onClick: () => setQuoting(true),
          } satisfies MenuItem,
        ]
      : []),
    ...(isOwn
      ? [
          {
            key: 'edit',
            label: t('post.edit'),
            icon: <IconPencil />,
            onClick: () => {
              setDraft(post.body ?? '');
              setEditing(true);
            },
          } satisfies MenuItem,
          {
            key: 'delete',
            label: t('post.delete'),
            icon: <IconTrash />,
            onClick: () => setConfirmDelete(true),
            danger: true,
          } satisfies MenuItem,
        ]
      : [
          {
            key: 'report',
            label: t('report.action'),
            icon: <IconFlag />,
            onClick: () => setReporting(true),
          } satisfies MenuItem,
        ]),
  ];

  return (
    <Card pad>
      <article className="osia-post">
        <div className="osia-post__head">
          <HoverCard content={<ProfilePeek brief={post.author} popularityLabel={t('profile.popularity')} />}>
            <Link href={routes.perfil(post.author.handle)} className="osia-post__author">
              <Avatar src={post.author.avatarUrl} name={post.author.displayName} size={40} />
              <span className="osia-post__names">
                <Text variant="subheading" as="span">
                  {post.author.displayName}
                </Text>
                <Text variant="meta" tone="subtle">
                  {`@${post.author.handle} · ${relativeTime(post.createdAt, locale)}${post.editedAt ? ` · ${t('post.edited')}` : ''}`}
                </Text>
              </span>
            </Link>
          </HoverCard>
          {menuItems.length > 0 && (
            <span className="osia-post__menu">
              <Menu label={t('post.more')} items={menuItems} triggerClassName="osia-iconbtn">
                <IconMore />
              </Menu>
            </span>
          )}
        </div>

        {editing ? (
          <div className="osia-composer__field">
            <MentionTextarea
              multiline
              value={draft}
              onChange={setDraft}
              ariaLabel={t('post.edit')}
              maxLength={POST_BODY_MAX + 1}
              invalid={draftTooLong}
              rows={3}
              autoFocus
            />
            <div className="osia-composer__row">
              <Button size="sm" variant="primary" disabled={!canSaveEdit} loading={edit.isPending} onClick={() => edit.mutate()}>
                {t('edit.save')}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                {t('edit.cancel')}
              </Button>
            </div>
          </div>
        ) : (
          post.body && <RichBody text={post.body} variant="read" className="osia-post__body" />
        )}
        {post.media.length > 0 && (
          <MediaGallery
            media={post.media}
            itemLabel={t('post.openMedia')}
            onItemClick={(i) => setLightboxIndex(i)}
          />
        )}

        {post.kind === 'echo' &&
          (post.referencedPost ? (
            <EmbeddedPost original={post.referencedPost} locale={locale} />
          ) : (
            <div className="osia-embed osia-embed--gone">
              <Text variant="meta" tone="muted">
                {t('echo.unavailable')}
              </Text>
            </div>
          ))}

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
          {canEcho && (
            <button
              type="button"
              className="osia-reactbtn"
              data-active={post.viewerEchoed || undefined}
              aria-pressed={post.viewerEchoed}
              aria-label={post.viewerEchoed ? t('echo.remove') : t('echo.action')}
              disabled={echo.isPending}
              onClick={() => echo.mutate()}
            >
              <IconEcho />
              {post.echoCount > 0 ? post.echoCount : ''}
            </button>
          )}
          <button
            type="button"
            className="osia-reactbtn"
            data-active={post.viewerBookmarked || undefined}
            aria-pressed={post.viewerBookmarked}
            aria-label={post.viewerBookmarked ? t('bookmarks.remove') : t('bookmarks.save')}
            disabled={bookmark.isPending}
            onClick={() => bookmark.mutate()}
          >
            <IconBookmark fill={post.viewerBookmarked ? 'currentColor' : 'none'} />
          </button>
          {post.recentReactors.length > 0 && (
            <button
              type="button"
              className="osia-reactors"
              aria-label={t('post.reactionsTitle')}
              onClick={() => setShowReactors(true)}
            >
              <span className="osia-reactors__stack">
                {post.recentReactors.map((r) => (
                  <Avatar key={r.profileId} src={r.avatarUrl} name={r.displayName} size={22} />
                ))}
              </span>
            </button>
          )}
        </div>

        {showComments && (
          <div className="osia-post__comments">
            <CommentThread postId={post.id} viewerHandle={viewerHandle} onMutated={onMutated} />
          </div>
        )}
      </article>

      {showReactors && <ReactionListModal postId={post.id} onClose={() => setShowReactors(false)} />}
      {reporting && <ReportDialog targetType="post" targetId={post.id} onClose={() => setReporting(false)} />}
      {quoting && <EchoDialog post={post} onClose={() => setQuoting(false)} />}
      {lightboxIndex !== null && (
        <Lightbox
          items={post.media}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          label={t('lightbox.label')}
          closeLabel={t('lightbox.close')}
          prevLabel={t('lightbox.prev')}
          nextLabel={t('lightbox.next')}
        />
      )}
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

/** El post ORIGINAL dentro de un eco (R4.3): tarjeta sobria clicable al detalle del original. */
function EmbeddedPost({ original, locale }: { original: EchoedPostDto; locale: string }) {
  const first = original.media[0];
  return (
    <Link href={routes.publicacion(original.id)} className="osia-embed">
      <span className="osia-embed__head">
        <Avatar src={original.author.avatarUrl} name={original.author.displayName} size={22} />
        <Text variant="meta" as="span">
          {original.author.displayName}
        </Text>
        <Text variant="caption" tone="subtle" as="span">
          {`@${original.author.handle} · ${relativeTime(original.createdAt, locale)}`}
        </Text>
      </span>
      {original.body && (
        <Text variant="read" tone="muted" className="osia-embed__body">
          {original.body}
        </Text>
      )}
      {first &&
        (first.kind === 'video' ? (
          <video className="osia-embed__media" src={first.url} muted preload="metadata" />
        ) : (
          <img className="osia-embed__media" src={first.url} alt="" loading="lazy" />
        ))}
    </Link>
  );
}

/** Vistazo de perfil para el HoverCard del autor (informativo; el click navega al perfil). */
function ProfilePeek({ brief, popularityLabel }: { brief: ProfileBrief; popularityLabel: string }) {
  return (
    <span className="osia-peek">
      <Avatar src={brief.avatarUrl} name={brief.displayName} size={48} ring />
      <span className="osia-peek__names">
        <Text variant="subheading" as="span">
          {brief.displayName}
        </Text>
        <Text variant="meta" tone="subtle" as="span">
          {`@${brief.handle}`}
        </Text>
      </span>
      <PopularityMeter points={brief.popularityPoints} label={popularityLabel} />
    </span>
  );
}
