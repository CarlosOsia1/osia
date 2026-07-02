'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useToast } from '@osia/ui';
import type { PostDto } from '@osia/shared';
import { removeReaction, setReaction } from '../api';
import {
  invalidatePostBearing,
  patchPostInCaches,
  restoreSocial,
  snapshotSocial,
} from './patch';

/**
 * Estrella optimista (R1): se pinta al instante donde viva el post (feed, detalle, perfil),
 * con rollback + toast si el servidor la rechaza, y reconciliación de fondo al asentarse.
 * Antes: refetch bloqueante del feed entero por cada estrella — lo contrario del lujo.
 */
export function useToggleReaction(post: PostDto) {
  const qc = useQueryClient();
  const toast = useToast();
  const t = useTranslations('social');
  const reacted = post.viewerReaction === 'star';

  return useMutation({
    mutationFn: async () => {
      if (reacted) await removeReaction(post.id, 'star');
      else await setReaction(post.id, 'star');
    },
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ['social'] });
      const snapshot = snapshotSocial(qc);
      patchPostInCaches(qc, post.id, (p) => ({
        ...p,
        viewerReaction: reacted ? null : 'star',
        reactionCount: Math.max(0, p.reactionCount + (reacted ? -1 : 1)),
      }));
      return { snapshot };
    },
    onError: (_err, _vars, context) => {
      if (context) restoreSocial(qc, context.snapshot);
      toast.error(t('errors.reaction'));
    },
    onSettled: () => invalidatePostBearing(qc),
  });
}
