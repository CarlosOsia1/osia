'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Card, Text } from '@osia/ui';
import { routes } from '../../lib/routes';
import { PostComposerForm } from './PostComposerForm';

/**
 * Piel de página del composer (`/crear`, R2): fallback del tab bar móvil y de deep-links. Las
 * tripas viven en `PostComposerForm` (las mismas del inline y el modal). Tras publicar, vuelve
 * al feed — el post ya está arriba.
 */
export function PostComposer() {
  const t = useTranslations('social');
  const router = useRouter();
  return (
    <div className="osia-composer-page">
      <Link href={routes.home} className="osia-composer-page__back">
        <Text variant="label" tone="subtle">{`← ${t('compose.back')}`}</Text>
      </Link>
      <Card pad>
        <div className="osia-composer-page__body">
          <Text variant="heading">{t('compose.title')}</Text>
          <PostComposerForm autoFocus onPublished={() => router.push(routes.home)} />
        </div>
      </Card>
    </div>
  );
}
