'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Button, HudPanel, useTheme } from '@osia/ui';
import { ambientDriver } from '../sound/ambientDriver';

/**
 * SoundToggle (S2-A2) — enciende/apaga el paisaje sonoro. El sonido es OPT-IN: silencio hasta
 * este gesto (el click reanuda el AudioContext; nunca autoplay). Al desmontar (salir del mundo)
 * libera el motor de audio para no dejar fugas (§7). Reusa Button/HudPanel de @osia/ui + i18n.
 */
export default function SoundToggle() {
  const { soundEnabled, setSoundEnabled } = useTheme();
  const t = useTranslations('sound');

  useEffect(() => () => void ambientDriver.dispose(), []);

  const toggle = (): void => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    if (next) void ambientDriver.start(); // este click ES el gesto que habilita el audio
    else ambientDriver.stop();
  };

  // Debajo del selector de idioma (arriba a la derecha); NO en la esquina inferior derecha,
  // donde vive el control de voz (VoiceHUD), para que no se crucen.
  return (
    <HudPanel interactive style={{ top: 64, right: 28 }}>
      <Button
        size="sm"
        active={soundEnabled}
        aria-pressed={soundEnabled}
        aria-label={t('aria')}
        onClick={toggle}
      >
        {soundEnabled ? t('on') : t('off')}
      </Button>
    </HudPanel>
  );
}
