'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Button, Modal, Text, useToast } from '@osia/ui';
import { POST_BODY_MAX, type PostDto } from '@osia/shared';
import { createEcho } from '../../lib/api';
import { queryKeys } from '../../lib/query-keys';
import { MentionTextarea } from './MentionTextarea';

/**
 * EchoDialog (R4.3) — amplificar CON nota (quote): tu texto encima del original. Siempre crea
 * un post nuevo (el toggle simple vive en el botón de eco). Al publicar, el feed se refresca.
 */
export function EchoDialog({ post, onClose }: { post: PostDto; onClose: () => void }) {
  const t = useTranslations('social');
  const toast = useToast();
  const qc = useQueryClient();
  const [body, setBody] = useState('');
  // El quote apunta al ORIGINAL: si esta tarjeta es un eco, a su raíz.
  const targetId = post.kind === 'echo' && post.referencedPost ? post.referencedPost.id : post.id;

  const send = useMutation({
    mutationFn: () => createEcho(targetId, body.trim()),
    onSuccess: () => {
      toast.success(t('echo.done'));
      void qc.invalidateQueries({ queryKey: queryKeys.feed });
      onClose();
    },
    onError: () => toast.error(t('echo.error')),
  });

  const tooLong = body.length > POST_BODY_MAX;
  const canSend = body.trim().length > 0 && !tooLong && !send.isPending;

  return (
    <Modal open onClose={onClose} title={t('echo.quoteTitle')}>
      <div className="osia-composer">
        <div className="osia-composer__field">
          <MentionTextarea
            multiline
            value={body}
            onChange={setBody}
            ariaLabel={t('echo.quoteLabel')}
            placeholder={t('echo.quotePlaceholder')}
            maxLength={POST_BODY_MAX + 1}
            invalid={tooLong}
            rows={3}
            autoFocus
          />
          <Text variant="label" tone={tooLong ? 'accent' : 'subtle'}>
            {t('compose.charCount', { count: body.length, max: POST_BODY_MAX })}
          </Text>
        </div>
        <div className="osia-composer__row">
          <Button variant="primary" disabled={!canSend} loading={send.isPending} onClick={() => send.mutate()}>
            {t('echo.publish')}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            {t('edit.cancel')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
