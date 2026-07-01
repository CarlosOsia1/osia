'use client';

import Link from 'next/link';
import { useRef, useState, type ChangeEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Button, Card, FormError, MediaGallery, Text, Textarea } from '@osia/ui';
import { OsiaApiError } from '@osia/identity';
import {
  POST_BODY_MAX,
  POST_MEDIA_MAX,
  POST_MEDIA_MIME_TYPES,
  POST_MEDIA_SIZE_MAX,
  POST_UPLOAD_MIME_TYPES,
  POST_VIDEO_MIME_TYPES,
  POST_VIDEO_SIZE_MAX,
  type MediaItem,
  type PostVisibility,
} from '@osia/shared';
import { createPost, MediaUploadError, uploadPostMedia } from '../../lib/social-api';

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
 * Editor de Post (S3.3-H1; foto/video en S3.10): texto (≤2000) y/o hasta 4 adjuntos (imagen o video),
 * cada uno subido DIRECTO a Storage por URL prefirmada. Preview con `MediaGallery`. Validación de cliente
 * por UX; el servidor revalida (§5). Todo el texto por `Text`/i18n (§2.1/§3).
 */
export function PostComposer() {
  const t = useTranslations('social');
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
    onSuccess: () => {
      setBody('');
      setFiles([]);
      setFileError(null);
      uploadedRef.current = new Map();
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    onSettled: () => setPhase(null),
  });

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
    <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
      <Link href="/" style={{ justifySelf: 'start', textDecoration: 'none' }}>
        <Text variant="label" tone="subtle">{`← ${t('compose.back')}`}</Text>
      </Link>
      <Card pad>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!disabled) mutation.mutate();
          }}
          style={{ display: 'grid', gap: 'var(--space-4)' }}
        >
          <Text variant="heading">{t('compose.title')}</Text>

          <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
            <Textarea
              aria-label={t('compose.bodyLabel')}
              placeholder={t('compose.bodyPlaceholder')}
              rows={4}
              value={body}
              maxLength={POST_BODY_MAX + 1}
              invalid={tooLong}
              onChange={(e) => setBody(e.target.value)}
            />
            <Text variant="label" tone={tooLong ? 'accent' : 'subtle'}>
              {t('compose.charCount', { count: body.length, max: POST_BODY_MAX })}
            </Text>
          </div>

          {previews.length > 0 && (
            <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
              <MediaGallery media={previews} />
              <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                {previews.map((p) => (
                  <Button key={p.i} type="button" variant="ghost" size="sm" onClick={() => removeFile(p.i)}>
                    {`✕ ${t('compose.media')} ${p.i + 1}`}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', flexWrap: 'wrap' }}>
            <input ref={fileInputRef} type="file" accept={ACCEPT} multiple onChange={onPickFiles} style={{ display: 'none' }} />
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

          <fieldset style={{ display: 'grid', gap: 'var(--space-2)', border: 0, padding: 0, margin: 0 }}>
            <Text variant="overline" tone="subtle" as="legend">
              {t('compose.visibility')}
            </Text>
            <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
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

          <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', flexWrap: 'wrap' }}>
            <Button type="submit" variant="primary" disabled={disabled} loading={mutation.isPending}>
              {!mutation.isPending
                ? t('compose.publish')
                : phase === 'uploading'
                  ? t('compose.uploading')
                  : t('compose.publishing')}
            </Button>
            {mutation.isSuccess && (
              <Text variant="label" tone="accent" role="status">
                {t('compose.success')}
              </Text>
            )}
          </div>

          {empty && !mutation.isPending && (
            <Text variant="label" tone="subtle">
              {t('compose.errorEmpty')}
            </Text>
          )}
          {fileError && <FormError>{fileError}</FormError>}
          {submitError && <FormError>{submitError}</FormError>}
        </form>
      </Card>
    </div>
  );
}
