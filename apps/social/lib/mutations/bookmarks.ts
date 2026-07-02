'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useToast } from '@osia/ui';
import type { PostDto } from '@osia/shared';
import { removeBookmark, setBookmark } from '../api';
import { queryKeys } from '../query-keys';
import { patchPostInCaches, restoreSocial, snapshotSocial } from './patch';

/**
 * Guardar/quitar optimista (R4.2): el marcador se pinta al instante donde viva el post, con
 * rollback + toast si falla. Al asentarse solo se invalida la LISTA de guardados (el estado
 * del post ya quedó parcheado; el feed no necesita refetch por esto).
 */
export function useToggleBookmark(post: PostDto) {
  const qc = useQueryClient();
  const toast = useToast();
  const t = useTranslations('social');
  const saved = post.viewerBookmarked;

  return useMutation({
    mutationFn: async () => {
      if (saved) await removeBookmark(post.id);
      else await setBookmark(post.id);
    },
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: queryKeys.all });
      const snapshot = snapshotSocial(qc);
      patchPostInCaches(qc, post.id, (p) => ({ ...p, viewerBookmarked: !saved }));
      return { snapshot };
    },
    onSuccess: () => {
      toast.success(saved ? t('bookmarks.removed') : t('bookmarks.saved'));
    },
    onError: (_err, _vars, context) => {
      if (context) restoreSocial(qc, context.snapshot);
      toast.error(t('bookmarks.error'));
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: queryKeys.bookmarks }),
  });
}
