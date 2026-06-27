'use client';

import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { Text } from '@osia/ui';
import PerfHUD from '@/src/world/PerfHUD';
import NetStatus from '@/src/world/NetStatus';
import AtmosphereTestPanel from '@/src/world/AtmosphereTestPanel';
import ChatPanel from '@/src/ui/ChatPanel';
import VoiceHUD from '@/src/ui/VoiceHUD';
import LanguageSwitcher from '@/src/ui/LanguageSwitcher';
import SoundToggle from '@/src/ui/SoundToggle';

// El engine 3D (Three.js / R3F) se carga SOLO en cliente y on-demand (code splitting):
// la entrada no arrastra Three.js en su bundle inicial (ver docs/08-estrategia-rendimiento.md).
const WorldCanvas = dynamic(() => import('@/src/world/WorldCanvas'), {
  ssr: false,
  loading: () => <Loading />,
});

function ScreenMessage({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ position: 'fixed', inset: 0, display: 'grid', placeItems: 'center' }}>
      <Text
        variant="title"
        tone="accent"
        style={{ letterSpacing: 'var(--tracking-widest)', textTransform: 'lowercase' }}
      >
        {children}
      </Text>
    </div>
  );
}

function Loading() {
  const t = useTranslations('app');
  return <ScreenMessage>{t('loading')}</ScreenMessage>;
}

export default function Page() {
  const t = useTranslations('app');
  return (
    <main style={{ position: 'fixed', inset: 0 }}>
      <WorldCanvas />
      {/* Título de marca (Italiana) — respira el cielo y lleva scrim para leerse de día y de noche. */}
      <Text
        variant="display"
        scrim
        style={{
          position: 'absolute',
          top: 24,
          left: 28,
          color: 'var(--atmo-tint, var(--color-accent))',
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        {t('title')}
      </Text>
      <NetStatus />
      <LanguageSwitcher />
      <Text
        variant="overline"
        scrim
        style={{ position: 'absolute', bottom: 22, left: 28, pointerEvents: 'none', userSelect: 'none' }}
      >
        {t('controls')}
      </Text>
      <ChatPanel />
      <VoiceHUD />
      <SoundToggle />
      {/* Paneles de desarrollo (perf + atmósfera): ocultos en producción salvo
          NEXT_PUBLIC_DEBUG_HUD=1, para no enviarlos en la build pública. */}
      {DEBUG_HUD && <PerfHUD />}
      {DEBUG_HUD && <AtmosphereTestPanel />}
    </main>
  );
}

// Visibles en desarrollo; en producción solo si se activa el flag explícito.
const DEBUG_HUD =
  process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_DEBUG_HUD === '1';
