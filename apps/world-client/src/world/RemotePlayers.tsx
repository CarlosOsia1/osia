'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { OSIA_COLORS } from '@osia/ui';
import { getNetClient, useNetState } from '../net/useNet';
import AvatarMesh from './AvatarMesh';

/**
 * RemotePlayers (S0.5-H3) — un avatar por entidad remota, interpolado con render-delay
 * (~100 ms) entre snapshots. El roster (join/leave) viene del store; las posiciones, por
 * refs en useFrame (sin re-render).
 */

const INTERP_DELAY = 100; // ms

function RemoteAvatar({ id }: { id: number }) {
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
    </group>
  );
}

export default function RemotePlayers() {
  const { remotes } = useNetState();
  return (
    <>
      {remotes.map((r) => (
        <RemoteAvatar key={r.id} id={r.id} />
      ))}
    </>
  );
}
