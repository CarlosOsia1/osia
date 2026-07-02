'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useToast } from '@osia/ui';
import type { PostDto } from '@osia/shared';
import { createEcho, removeEcho } from '../api';
import { queryKeys } from '../query-keys';
import { patchPostInCaches, restoreSocial, snapshotSocial } from './patch';

/**
 * Eco SIMPLE optimista (R4.3): el toggle pinta al instante (viewerEchoed + echoCount) con
 * rollback + toast si falla, y al asentarse invalida el feed (el eco nuevo aparece arriba;
 * des-ecoar lo retira). El quote (con nota) va aparte por `EchoDialog` — siempre crea.
 */
export function useToggleEcho(post: PostDto) {
  const qc = useQueryClient();
  const toast = useToast();
  const t = useTranslations('social');
  const echoed = post.viewerEchoed;
  // El toggle opera sobre el ORIGINAL: si esta tarjeta ES un eco, sobre su raíz.
  const targetId = post.kind === 'echo' && post.referencedPost ? post.referencedPost.id : post.id;

  return useMutation({
    mutationFn: async () => {
      if (echoed) await removeEcho(targetId);
      else await createEcho(targetId);
    },
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: queryKeys.all });
      const snapshot = snapshotSocial(qc);
      patchPostInCaches(qc, targetId, (p) => ({
        ...p,
        viewerEchoed: !echoed,
        echoCount: Math.max(0, p.echoCount + (echoed ? -1 : 1)),
      }));
      return { snapshot };
    },
    onSuccess: () => {
      toast.success(echoed ? t('echo.removed') : t('echo.done'));
    },
    onError: (_err, _vars, context) => {
      if (context) restoreSocial(qc, context.snapshot);
      toast.error(t('echo.error'));
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: queryKeys.feed }),
  });
}
