'use client';

import dynamic from 'next/dynamic';
import PerfHUD from '@/src/world/PerfHUD';
import NetStatus from '@/src/world/NetStatus';
import AtmosphereTestPanel from '@/src/world/AtmosphereTestPanel';
import ChatPanel from '@/src/ui/ChatPanel';
import VoiceHUD from '@/src/ui/VoiceHUD';

// El engine 3D (Three.js / R3F) se carga SOLO en cliente y on-demand (code splitting):
// la entrada no arrastra Three.js en su bundle inicial (ver docs/08-estrategia-rendimiento.md).
const WorldCanvas = dynamic(() => import('@/src/world/WorldCanvas'), {
  ssr: false,
  loading: () => <ScreenMessage>despertando el mundo…</ScreenMessage>,
});

function ScreenMessage({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'grid',
        placeItems: 'center',
        color: '#cbb89a',
        letterSpacing: '0.25em',
        textTransform: 'lowercase',
        fontSize: 14,
      }}
    >
      {children}
    </div>
  );
}

export default function Page() {
  return (
    <main style={{ position: 'fixed', inset: 0 }}>
      <WorldCanvas />
      <div
        style={{
          position: 'absolute',
          top: 24,
          left: 28,
          color: '#cbb89a',
          letterSpacing: '0.35em',
          fontSize: 13,
          textTransform: 'uppercase',
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        OSIA · El Mundo
      </div>
      <NetStatus />
      <div
        style={{
          position: 'absolute',
          bottom: 22,
          left: 28,
          color: '#8c7b66',
          letterSpacing: '0.18em',
          fontSize: 11,
          textTransform: 'uppercase',
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        WASD / flechas · caminar — clic · mirar — ENTER · chat — ESC · soltar
      </div>
      <ChatPanel />
      <VoiceHUD />
      <PerfHUD />
      <AtmosphereTestPanel />
    </main>
  );
}
