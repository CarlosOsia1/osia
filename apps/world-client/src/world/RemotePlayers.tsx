'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { OSIA_COLORS } from '@osia/ui';
import { getNetClient, useNetState } from '../net/useNet';
import { INTERP_DELAY_MS } from '../net/config';
import type { Sample } from '../net/NetClient';
import AvatarMesh from './AvatarMesh';

/**
 * RemotePlayers (S0.5-H3) — un avatar por entidad remota, interpolado con render-delay
 * (INTERP_DELAY_MS) entre snapshots. El roster (join/leave) viene del store; las posiciones,
 * por refs en useFrame (sin re-render).
 */

function RemoteAvatar({ id }: { id: number }) {
  const group = useRef<THREE.Group>(null);
  const net = useRef(getNetClient()).current;
  const prev = useRef(new THREE.Vector3());
  const inited = useRef(false);
  const s = useRef<Sample>({ t: 0, x: 0, z: 0, yaw: 0 }).current; // muestra reutilizable (sin alloc/frame)

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    if (!net.sampleRemote(id, performance.now() - INTERP_DELAY_MS, s)) return;
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
