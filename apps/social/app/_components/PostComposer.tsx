'use client';

import Link from 'next/link';
import { useRef, useState, type ChangeEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Button, Card, FormError, Text, Textarea } from '@osia/ui';
import { OsiaApiError } from '@osia/identity';
import {
  POST_BODY_MAX,
  POST_MEDIA_MIME_TYPES,
  POST_MEDIA_SIZE_MAX,
  type PostMediaMime,
  type PostVisibility,
} from '@osia/shared';
import { createPost, MediaUploadError, uploadImage } from '../../lib/social-api';

const VISIBILITIES: { value: PostVisibility; key: 'visibilityPublic' | 'visibilityFollowers' | 'visibilityPrivate' }[] = [
  { value: 'public', key: 'visibilityPublic' },
  { value: 'followers', key: 'visibilityFollowers' },
  { value: 'private', key: 'visibilityPrivate' },
];

const ACCEPT = POST_MEDIA_MIME_TYPES.join(',');
const SIZE_MAX_MB = Math.round(POST_MEDIA_SIZE_MAX / (1024 * 1024));

/**
 * Editor de Post (S3.3-H1): texto (≤2000) y/o una imagen (subida prefirmada directa a Storage) +
 * visibilidad. Todo el texto pasa por `Text`/i18n (§2.1/§3). El feed donde verlo llega en S3.3-H4;
 * por ahora confirma la publicación. La validación de cliente es por UX; el servidor revalida (§5).
 */
export function PostComposer() {
  const t = useTranslations('social');
  const [body, setBody] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<PostVisibility>('public');
  const fileInputRef = useRef<HTMLInputElement>(null);
  // URL ya subida para el archivo actual: evita re-subir (y dejar otro huérfano) si se reintenta publicar.
  const uploadedRef = useRef<{ file: File; url: string } | null>(null);
  const [phase, setPhase] = useState<'uploading' | 'publishing' | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      // Deuda diferida (S3.6): si la subida tiene éxito pero `createPost` falla, el objeto queda huérfano
      // en el bucket; un barrido por lifecycle lo limpiará. Aquí cacheamos la URL ya subida para que un
      // reintento NO vuelva a subir (no acumula un huérfano por intento).
      let media: string[] = [];
      if (file) {
        if (uploadedRef.current?.file === file) {
          media = [uploadedRef.current.url];
        } else {
          setPhase('uploading');
          const url = await uploadImage(file);
          uploadedRef.current = { file, url };
          media = [url];
        }
      }
      setPhase('publishing');
      return createPost({
        kind: media.length > 0 ? 'image' : 'text',
        body: body.trim() ? body.trim() : undefined,
        media: media.length > 0 ? media : undefined,
        visibility,
      });
    },
    onSuccess: () => {
      setBody('');
      setFile(null);
      setFileError(null);
      uploadedRef.current = null;
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    onSettled: () => setPhase(null),
  });

  const onPickFile = (e: ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0] ?? null;
    if (!picked) return;
    if (!(POST_MEDIA_MIME_TYPES as readonly string[]).includes(picked.type)) {
      setFileError(t('compose.errorImageType'));
      return;
    }
    if (picked.size > POST_MEDIA_SIZE_MAX) {
      setFileError(t('compose.errorImageSize', { mb: SIZE_MAX_MB }));
      return;
    }
    setFileError(null);
    uploadedRef.current = null;
    setFile(picked);
  };

  const removeFile = () => {
    setFile(null);
    setFileError(null);
    uploadedRef.current = null;
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const tooLong = body.length > POST_BODY_MAX;
  const empty = body.trim().length === 0 && !file;
  const disabled = mutation.isPending || tooLong || empty;

  const submitError =
    mutation.isError
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
        <Text variant="title">{t('compose.title')}</Text>

        <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
          <Textarea
            aria-label={t('compose.bodyLabel')}
            placeholder={t('compose.bodyPlaceholder')}
            rows={5}
            value={body}
            maxLength={POST_BODY_MAX + 1}
            invalid={tooLong}
            onChange={(e) => setBody(e.target.value)}
          />
          <Text variant="label" tone={tooLong ? 'accent' : 'subtle'}>
            {t('compose.charCount', { count: body.length, max: POST_BODY_MAX })}
          </Text>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT}
            onChange={onPickFile}
            style={{ display: 'none' }}
          />
          <Button type="button" variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
            {t('compose.addImage')}
          </Button>
          {file && (
            <>
              <Text variant="label" tone="muted">
                {file.name}
              </Text>
              <Button type="button" variant="ghost" size="sm" onClick={removeFile}>
                {t('compose.removeImage')}
              </Button>
            </>
          )}
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
