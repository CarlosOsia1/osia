'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { OSIA_COLORS } from '@osia/ui';
import { getNetClient, useNetState } from '../net/useNet';
import { purgeExpiredBubbles, type Bubble } from '../net/store';
import AvatarMesh from './AvatarMesh';

/**
 * RemotePlayers (S0.5-H3 + S0.6) — un avatar por entidad remota, interpolado con
 * render-delay (~100 ms). El roster (join/leave) y las burbujas de chat vienen del
 * store; las posiciones, por refs en useFrame. La burbuja se monta SOLO mientras el
 * mensaje está vivo (un <Html> permanente por jugador tanquearía el FPS).
 */

const INTERP_DELAY = 100; // ms
const HEAD_Y = 2.7; // sobre la chispa del avatar (cono 0.7 + cabeza 1.62 + chispa 2.16)

function ChatBubble({ text }: { text: string }) {
  return (
    <div
      style={{
        maxWidth: 220,
        padding: '6px 11px',
        borderRadius: 12,
        background: 'rgba(20,18,15,0.82)',
        border: '1px solid rgba(203,184,154,0.28)',
        color: '#f0e7d6',
        font: '500 13px/1.35 Jost, system-ui, sans-serif',
        textAlign: 'center',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        backdropFilter: 'blur(6px)',
        boxShadow: '0 4px 18px rgba(0,0,0,0.35)',
        transform: 'translateY(-6px)',
        animation: 'osia-bubble-in 180ms ease-out',
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    >
      {text}
    </div>
  );
}

function RemoteAvatar({ id, bubble }: { id: number; bubble?: Bubble }) {
  const group = useRef<THREE.Group>(null);
  const net = useRef(getNetClient()).current;
  const prev = useRef(new THREE.Vector3());
  const inited = useRef(false);

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const s = net.sampleRemote(id, performance.now() - INTERP_DELAY);
    if (!s) return;
    if (!inited.current) {
      g.position.set(s.x, 0, s.z);
      prev.current.set(s.x, 0, s.z);
      inited.current = true;
      return;
    }
    const dx = s.x - prev.current.x;
    const dz = s.z - prev.current.z;
    if (dx * dx + dz * dz > 1e-5) g.rotation.y = Math.atan2(dx, dz); // mira hacia donde camina
    g.position.set(s.x, 0, s.z);
    prev.current.set(s.x, 0, s.z);
  });

  return (
    <group ref={group}>
      <AvatarMesh cloakColor={OSIA_COLORS.taupe} />
      {bubble && (
        <Html
          position={[0, HEAD_Y, 0]}
          center
          distanceFactor={10}
          zIndexRange={[100, 0]}
          style={{ pointerEvents: 'none' }}
        >
          <ChatBubble text={bubble.text} />
        </Html>
      )}
    </group>
  );
}

export default function RemotePlayers() {
  const { remotes, bubbles } = useNetState();
  useFrame(() => purgeExpiredBubbles()); // un solo loop purga las burbujas vencidas
  return (
    <>
      {remotes.map((r) => (
        <RemoteAvatar key={r.id} id={r.id} bubble={bubbles[r.id]} />
      ))}
    </>
  );
}
