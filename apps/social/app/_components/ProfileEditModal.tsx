'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import {
  Modal,
  Button,
  Textarea,
  Switch,
  ImageUploadField,
  Text,
  FormError,
  IconCamera,
  IconImage,
} from '@osia/ui';
import { PROFILE_BIO_MAX } from '@osia/shared';
import type { PublicProfileDto } from '@osia/shared';
import { MediaUploadError, updateBio, updateProfileCard, uploadProfileImage } from '../../lib/social-api';

const PROFILE_KEY = ['social', 'profile'] as const;

/**
 * ProfileEditModal (S3.8) — edición del propio perfil: foto, portada, bio y privacidad. La media sube
 * DIRECTA a Storage (URL prefirmada) y se persiste su URL; la bio reusa el endpoint de identidad. Al
 * guardar, invalida el perfil para reflejar los cambios. Todo el estilo/texto por @osia/ui + i18n.
 */
export function ProfileEditModal({
  open,
  onClose,
  profile,
}: {
  open: boolean;
  onClose: () => void;
  profile: PublicProfileDto;
}) {
  const t = useTranslations('social');
  const qc = useQueryClient();
  const [photoUrl, setPhotoUrl] = useState<string | null>(profile.photoUrl);
  const [coverUrl, setCoverUrl] = useState<string | null>(profile.coverUrl);
  const [isPrivate, setIsPrivate] = useState(profile.isPrivate);
  const [bio, setBio] = useState(profile.bio ?? '');
  const [uploading, setUploading] = useState<'photo' | 'cover' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function pick(kind: 'photo' | 'cover', file: File): Promise<void> {
    setError(null);
    setUploading(kind);
    try {
      const url = await uploadProfileImage(kind, file);
      if (kind === 'photo') setPhotoUrl(url);
      else setCoverUrl(url);
    } catch (e) {
      setError(e instanceof MediaUploadError ? t('edit.errorUpload') : t('edit.error'));
    } finally {
      setUploading(null);
    }
  }

  const save = useMutation({
    mutationFn: async () => {
      await updateProfileCard({ isPrivate, photoUrl, coverUrl });
      if ((profile.bio ?? '') !== bio.trim()) await updateBio(bio.trim());
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: PROFILE_KEY });
      onClose();
    },
    onError: () => setError(t('edit.error')),
  });

  if (!open) return null;
  return (
    <Modal open={open} onClose={onClose} title={t('edit.title')}>
      <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
        <ImageUploadField
          label={t('edit.cover')}
          previewUrl={coverUrl}
          uploading={uploading === 'cover'}
          onFile={(f) => void pick('cover', f)}
          icon={<IconImage />}
          hint={t('edit.coverHint')}
        />
        <ImageUploadField
          label={t('edit.photo')}
          previewUrl={photoUrl ?? profile.avatarUrl}
          uploading={uploading === 'photo'}
          round
          onFile={(f) => void pick('photo', f)}
          icon={<IconCamera />}
        />
        <label style={{ display: 'grid', gap: 'var(--space-2)' }}>
          <Text variant="caption" as="span">
            {t('edit.bio')}
          </Text>
          <Textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={PROFILE_BIO_MAX}
            rows={3}
            placeholder={t('edit.bioPlaceholder')}
          />
        </label>
        <Switch checked={isPrivate} onChange={setIsPrivate} label={t('edit.private')} />
        <Text variant="meta" tone="muted">
          {t('edit.privateHint')}
        </Text>
        {error && <FormError>{error}</FormError>}
        <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={onClose}>
            {t('edit.cancel')}
          </Button>
          <Button variant="primary" loading={save.isPending} disabled={uploading !== null} onClick={() => save.mutate()}>
            {t('edit.save')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
