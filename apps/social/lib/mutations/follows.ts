'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useToast } from '@osia/ui';
import { followAccount, unfollowAccount } from '../api';
import { queryKeys } from '../query-keys';
import { patchProfileInCaches, restoreSocial, snapshotSocial } from './patch';

/**
 * Seguir/dejar de seguir optimista (R1): el botón cambia al instante en el perfil y en las
 * listas (búsqueda/descubrir), con rollback + toast si falla y reconciliación de fondo.
 *
 * Con cuenta privada el follow nace `requested` (lo decide el servidor): si el caller conoce
 * `isPrivate` (el perfil lo trae) el optimista acierta desde el primer frame; si no, asume
 * `following` y la reconciliación lo corrige enseguida.
 */
export function useToggleFollow(target: {
  accountId: string;
  viewerState: 'following' | 'requested' | 'none';
  isPrivate?: boolean;
}) {
  const qc = useQueryClient();
  const toast = useToast();
  const t = useTranslations('social');
  const { accountId, viewerState, isPrivate } = target;
  const unfollowing = viewerState !== 'none';

  return useMutation({
    mutationFn: async () => {
      if (unfollowing) await unfollowAccount(accountId);
      else await followAccount(accountId);
    },
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: queryKeys.all });
      const snapshot = snapshotSocial(qc);
      const nextState = unfollowing ? 'none' : isPrivate ? 'requested' : 'following';
      patchProfileInCaches(qc, accountId, (profile) => {
        const patched = { ...profile, viewerState: nextState };
        // El conteo solo se mueve con un follow ACTIVO (una solicitud pendiente no cuenta).
        if ('followersCount' in patched && typeof patched.followersCount === 'number') {
          if (unfollowing && viewerState === 'following') patched.followersCount -= 1;
          if (!unfollowing && nextState === 'following') patched.followersCount += 1;
        }
        if ('isFollowing' in patched) patched.isFollowing = nextState === 'following';
        return patched;
      });
      return { snapshot };
    },
    onError: (_err, _vars, context) => {
      if (context) restoreSocial(qc, context.snapshot);
      toast.error(t('errors.follow'));
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.discover });
      void qc.invalidateQueries({ queryKey: ['social', 'search'] });
      void qc.invalidateQueries({ queryKey: ['social', 'profile'] });
      void qc.invalidateQueries({ queryKey: ['social', 'followers'] });
      void qc.invalidateQueries({ queryKey: ['social', 'following'] });
    },
  });
}
