'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Avatar, Button, Card, Text } from '@osia/ui';
import { useOsiaSession } from '@osia/identity';
import { identity } from '../../lib/identity';
import { PostComposerForm } from './PostComposerForm';

/**
 * Composer inline del Salón (R2): colapsado es una invitación serena («¿Qué contemplas hoy?»);
 * al enfocar/clicar se expande al composer real (mismas tripas: `PostComposerForm`). Publicar
 * lo colapsa — el post ya quedó arriba del feed.
 */
export function ComposerInline() {
  const t = useTranslations('social');
  const [open, setOpen] = useState(false);
  const profile = useOsiaSession(identity).data?.passport?.profile ?? null;

  if (!open) {
    return (
      <button type="button" className="osia-composer-inline" onClick={() => setOpen(true)}>
        <Avatar src={profile?.avatarUrl ?? undefined} name={profile?.displayName ?? 'OSIA'} size={40} />
        <span>{t('compose.prompt')}</span>
      </button>
    );
  }
  return (
    <Card pad>
      <div className="osia-composer-page__body">
        <div className="osia-composer__head">
          <Text variant="subheading">{t('compose.title')}</Text>
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
            {t('edit.cancel')}
          </Button>
        </div>
        <PostComposerForm autoFocus onPublished={() => setOpen(false)} />
      </div>
    </Card>
  );
}
