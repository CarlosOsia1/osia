'use client';

import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Button, type ButtonSize } from '@osia/ui';
import { followAccount, unfollowAccount } from '../../lib/social-api';

/**
 * FollowButton (S3.11) — seguir/solicitar/dejar de seguir por `accountId`, reutilizable (Descubrir,
 * Buscar). El estado lo trae el DTO (`viewerState`); tras la acción avisa (`onChanged`) para refrescar.
 * El backend decide si el follow nace activo (pública) o pendiente (privada); el refetch pinta el estado.
 */
export function FollowButton({
  accountId,
  viewerState,
  onChanged,
  size = 'sm',
}: {
  accountId: string;
  viewerState: 'following' | 'requested' | 'none';
  onChanged?: () => void;
  size?: ButtonSize;
}) {
  const t = useTranslations('social');
  const m = useMutation({
    mutationFn: async () => {
      if (viewerState === 'none') await followAccount(accountId);
      else await unfollowAccount(accountId); // dejar de seguir o cancelar solicitud
    },
    onSuccess: () => onChanged?.(),
  });
  const label =
    viewerState === 'following'
      ? t('profile.followingState')
      : viewerState === 'requested'
        ? t('profile.requested')
        : t('profile.follow');
  return (
    <Button
      size={size}
      variant={viewerState === 'none' ? 'primary' : 'ghost'}
      active={viewerState !== 'none'}
      loading={m.isPending}
      onClick={() => m.mutate()}
    >
      {label}
    </Button>
  );
}
