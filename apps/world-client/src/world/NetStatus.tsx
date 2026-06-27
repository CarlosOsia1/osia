'use client';

import { useTranslations } from 'next-intl';
import { Dot, HudPanel, Text } from '@osia/ui';
import { useNetState } from '../net/useNet';

/**
 * NetStatus — overlay HTML (fuera del Canvas) con el estado de presencia:
 * conexión + número de viajeros. Texto vía i18n (@osia/i18n), estética vía tokens (@osia/ui).
 */
export default function NetStatus() {
  const { status, count } = useNetState();
  const t = useTranslations('net');

  let label: string;
  let dot: string; // token de color (CSS var)
  switch (status) {
    case 'connected':
      label = t('travelers', { count });
      dot = 'var(--color-accent)';
      break;
    case 'connecting':
      label = t('connecting');
      dot = 'var(--color-warning)';
      break;
    case 'reconnecting':
      label = t('reconnecting');
      dot = 'var(--color-warning)';
      break;
    case 'unauthenticated':
      label = t('unauthenticated');
      dot = 'var(--color-danger)';
      break;
    default:
      label = t('offline');
      dot = 'var(--color-text-subtle)';
      break;
  }

  return (
    <HudPanel style={{ top: 52, left: 28, display: 'flex', alignItems: 'center', gap: 8 }}>
      <Dot color={dot} glow />
      <Text variant="label" scrim style={{ textTransform: 'lowercase' }}>
        {label}
      </Text>
    </HudPanel>
  );
}
