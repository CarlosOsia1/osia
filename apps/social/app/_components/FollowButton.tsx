'use client';

import { useTranslations } from 'next-intl';
import { Button, type ButtonSize } from '@osia/ui';
import { useToggleFollow } from '../../lib/mutations/follows';

/**
 * FollowButton (S3.11) — seguir/solicitar/dejar de seguir por `accountId`, reutilizable (Descubrir,
 * Buscar, Perfil). El estado lo trae el DTO (`viewerState`); desde R1 la acción es OPTIMISTA: el
 * botón cambia al instante (con `isPrivate` acierta si nace `requested`), con rollback + toast si
 * falla y reconciliación de fondo. `onChanged` avisa al caller que aún refresque listas propias.
 */
export function FollowButton({
  accountId,
  viewerState,
  isPrivate,
  onChanged,
  size = 'sm',
}: {
  accountId: string;
  viewerState: 'following' | 'requested' | 'none';
  /** Si el caller lo sabe (el perfil lo trae), el optimista pinta `requested` desde el primer frame. */
  isPrivate?: boolean;
  onChanged?: () => void;
  size?: ButtonSize;
}) {
  const t = useTranslations('social');
  const m = useToggleFollow({ accountId, viewerState, isPrivate });
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
      onClick={() => m.mutate(undefined, { onSuccess: onChanged })}
    >
      {label}
    </Button>
  );
}
