'use client';

import { useRef, useState, type ChangeEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Button, FormError, MediaGallery, Text, useToast } from '@osia/ui';
import { OsiaApiError } from '@osia/identity';
import {
  POST_BODY_MAX,
  POST_MEDIA_MAX,
  POST_MEDIA_MIME_TYPES,
  POST_MEDIA_SIZE_MAX,
  POST_UPLOAD_MIME_TYPES,
  POST_VIDEO_MIME_TYPES,
  POST_VIDEO_SIZE_MAX,
  type FeedItemDto,
  type MediaItem,
  type Page,
  type PostDto,
  type PostVisibility,
} from '@osia/shared';
import { createPost, MediaUploadError, uploadPostMedia } from '../../lib/api';
import { queryKeys } from '../../lib/query-keys';
import { MentionTextarea } from './MentionTextarea';

const VISIBILITIES: { value: PostVisibility; key: 'visibilityPublic' | 'visibilityFollowers' | 'visibilityPrivate' }[] = [
  { value: 'public', key: 'visibilityPublic' },
  { value: 'followers', key: 'visibilityFollowers' },
  { value: 'private', key: 'visibilityPrivate' },
];

const ACCEPT = POST_UPLOAD_MIME_TYPES.join(',');
const IMG_MB = Math.round(POST_MEDIA_SIZE_MAX / (1024 * 1024));
const VID_MB = Math.round(POST_VIDEO_SIZE_MAX / (1024 * 1024));
const isVideo = (t: string): boolean => (POST_VIDEO_MIME_TYPES as readonly string[]).includes(t);
const isImage = (t: string): boolean => (POST_MEDIA_MIME_TYPES as readonly string[]).includes(t);

/**
 * Las tripas del composer (R2): texto (≤2000) y/o hasta 4 adjuntos (imagen o video) subidos
 * DIRECTO a Storage por URL prefirmada, con dedup por archivo (un reintento no re-sube ni deja
 * huérfanos). UNA sola máquina para las tres pieles: inline en el feed, modal global y `/crear`.
 * Al publicar, el post se INSERTA arriba del feed en caliente (y se reconcilia de fondo) y se
 * confirma con toast. Validación de cliente por UX; el servidor revalida (§5).
 */
export function PostComposerForm({
  autoFocus = false,
  onPublished,
}: {
  autoFocus?: boolean;
  /** Tras publicar (cerrar modal / colapsar inline / navegar). El feed ya quedó actualizado. */
  onPublished?: (post: PostDto) => void;
}) {
  const t = useTranslations('social');
  const toast = useToast();
  const qc = useQueryClient();
  const [body, setBody] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<PostVisibility>('public');
  const fileInputRef = useRef<HTMLInputElement>(null);
  // MediaItem ya subido por archivo: un reintento de publicar no vuelve a subir (no acumula huérfanos).
  const uploadedRef = useRef<Map<File, MediaItem>>(new Map());
  const [phase, setPhase] = useState<'uploading' | 'publishing' | null>(null);

  const previews = files.map((f, i) => ({ url: URL.createObjectURL(f), kind: isVideo(f.type) ? 'video' : 'image', i }) as MediaItem & { i: number });

  const mutation = useMutation({
    mutationFn: async () => {
      const media: MediaItem[] = [];
      if (files.length > 0) {
        setPhase('uploading');
        for (const file of files) {
          const cached = uploadedRef.current.get(file);
          if (cached) {
            media.push(cached);
          } else {
            const item = await uploadPostMedia(file);
            uploadedRef.current.set(file, item);
            media.push(item);
          }
        }
      }
      setPhase('publishing');
      const kind = media.some((m) => m.kind === 'video') ? 'video' : media.length > 0 ? 'image' : 'text';
      return createPost({
        kind,
        body: body.trim() ? body.trim() : undefined,
        media: media.length > 0 ? media : undefined,
        visibility,
      });
    },
    onSuccess: (post) => {
      setBody('');
      setFiles([]);
      setFileError(null);
      uploadedRef.current = new Map();
      if (fileInputRef.current) fileInputRef.current.value = '';
      prependToFeed(post);
      toast.success(t('compose.success'));
      onPublished?.(post);
    },
    onSettled: () => setPhase(null),
  });

  /** El post recién publicado aparece ARRIBA del feed al instante; el refetch de fondo reconcilia. */
  function prependToFeed(post: PostDto): void {
    type FeedData = { pages: Page<FeedItemDto>[]; pageParams: unknown[] };
    const item: FeedItemDto = { id: post.id, post, reason: 'follow', score: 0, createdAt: post.createdAt };
    qc.setQueryData(queryKeys.feed, (old: FeedData | undefined) => {
      const first = old?.pages[0];
      if (!old || !first) return old;
      return { ...old, pages: [{ ...first, data: [item, ...first.data] }, ...old.pages.slice(1)] };
    });
    void qc.invalidateQueries({ queryKey: queryKeys.feed });
  }

  const onPickFiles = (e: ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (picked.length === 0) return;
    const next = [...files];
    for (const f of picked) {
      if (next.length >= POST_MEDIA_MAX) {
        setFileError(t('compose.errorMediaMax', { max: POST_MEDIA_MAX }));
        break;
      }
      if (!isImage(f.type) && !isVideo(f.type)) {
        setFileError(t('compose.errorMediaType'));
        continue;
      }
      const max = isVideo(f.type) ? POST_VIDEO_SIZE_MAX : POST_MEDIA_SIZE_MAX;
      if (f.size > max) {
        setFileError(t('compose.errorMediaSize', { mb: isVideo(f.type) ? VID_MB : IMG_MB }));
        continue;
      }
      next.push(f);
      setFileError(null);
    }
    setFiles(next);
  };

  const removeFile = (idx: number) => {
    setFiles((fs) => fs.filter((_, i) => i !== idx));
    setFileError(null);
  };

  const tooLong = body.length > POST_BODY_MAX;
  const empty = body.trim().length === 0 && files.length === 0;
  const disabled = mutation.isPending || tooLong || empty;

  const submitError = mutation.isError
    ? mutation.error instanceof MediaUploadError
      ? t('compose.errorUpload')
      : mutation.error instanceof OsiaApiError && mutation.error.message
        ? mutation.error.message
        : t('compose.error')
    : null;

  return (
    <form
      className="osia-composer"
      onSubmit={(e) => {
        e.preventDefault();
        if (!disabled) mutation.mutate();
      }}
    >
      <div className="osia-composer__field">
        <MentionTextarea
          multiline
          ariaLabel={t('compose.bodyLabel')}
          placeholder={t('compose.bodyPlaceholder')}
          rows={4}
          value={body}
          maxLength={POST_BODY_MAX + 1}
          invalid={tooLong}
          autoFocus={autoFocus}
          onChange={setBody}
        />
        <Text variant="label" tone={tooLong ? 'accent' : 'subtle'}>
          {t('compose.charCount', { count: body.length, max: POST_BODY_MAX })}
        </Text>
      </div>

      {previews.length > 0 && (
        <div className="osia-composer__field">
          <MediaGallery media={previews} />
          <div className="osia-composer__row">
            {previews.map((p) => (
              <Button key={p.i} type="button" variant="ghost" size="sm" onClick={() => removeFile(p.i)}>
                {t('compose.removeMedia', { n: p.i + 1 })}
              </Button>
            ))}
          </div>
        </div>
      )}

      <div className="osia-composer__row">
        <input ref={fileInputRef} type="file" accept={ACCEPT} multiple onChange={onPickFiles} className="osia-composer__file" />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={files.length >= POST_MEDIA_MAX}
          onClick={() => fileInputRef.current?.click()}
        >
          {t('compose.addMedia')}
        </Button>
      </div>

      <fieldset className="osia-composer__fieldset">
        <Text variant="overline" tone="subtle" as="legend">
          {t('compose.visibility')}
        </Text>
        <div className="osia-composer__row">
          {VISIBILITIES.map((v) => (
            <Button
              key={v.value}
              type="button"
              size="sm"
              variant={visibility === v.value ? 'primary' : 'ghost'}
              active={visibility === v.value}
              aria-pressed={visibility === v.value}
              onClick={() => setVisibility(v.value)}
            >
              {t(`compose.${v.key}`)}
            </Button>
          ))}
        </div>
      </fieldset>

      <div className="osia-composer__row">
        <Button type="submit" variant="primary" disabled={disabled} loading={mutation.isPending}>
          {!mutation.isPending
            ? t('compose.publish')
            : phase === 'uploading'
              ? t('compose.uploading')
              : t('compose.publishing')}
        </Button>
        {empty && !mutation.isPending && (
          <Text variant="label" tone="subtle">
            {t('compose.errorEmpty')}
          </Text>
        )}
      </div>

      {fileError && <FormError>{fileError}</FormError>}
      {submitError && <FormError>{submitError}</FormError>}
    </form>
  );
}
