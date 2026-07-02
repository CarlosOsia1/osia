'use client';

import { useTranslations } from 'next-intl';
import { Modal } from '@osia/ui';
import { PostComposerForm } from './PostComposerForm';

/**
 * Composer como modal global (R2): se abre desde el CTA «Publicar» del sidebar, disponible en
 * cualquier ruta del Salón. Mismas tripas (`PostComposerForm`); publicar lo cierra.
 */
export function ComposerModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslations('social');
  return (
    <Modal open={open} onClose={onClose} title={t('compose.title')} className="osia-composer-modal">
      <PostComposerForm autoFocus onPublished={onClose} />
    </Modal>
  );
}
