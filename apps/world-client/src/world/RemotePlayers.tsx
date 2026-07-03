'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { Nameplate } from '@osia/ui';
import { getNetClient, useNetState } from '../net/useNet';
import { INTERP_DELAY_MS } from '../net/config';
import type { Sample } from '../net/NetClient';
import { terrainHeight } from './terrain';
import { prefersReducedMotion } from './motionPrefs';
import { createAvatarMotionState, stepAvatarMotion, type AvatarParts } from './avatarMotion';
import AvatarMesh from './AvatarMesh';

/**
 * RemotePlayers (S0.5-H3 / S1.8-H2) — un avatar por entidad remota, interpolado con render-delay
 * (INTERP_DELAY_MS) entre snapshots. El roster (join/leave + identidad: handle + acento) viene del
 * store; las posiciones, por refs en useFrame (sin re-render). El avatar se tiñe con el acento del
 * residente y lleva su nameplate (identidad visible).
 */

function RemoteAvatar({
  id,
  handle,
  accentColor,
}: {
  id: number;
  handle: string;
  accentColor: string;
}) {
  const group = useRef<THREE.Group | null>(null);
  const net = useRef(getNetClient()).current;
  const prev = useRef(new THREE.Vector3());
  const inited = useRef(false);
  const s = useRef<Sample>({ t: 0, x: 0, z: 0, yaw: 0 }).current; // muestra reutilizable (sin alloc/frame)
  // Animación procedural (M3): la velocidad se DERIVA de la interpolación (no viaja extra por red).
  const parts = useRef<AvatarParts>({ outer: null, body: null, cloak: null, spark: null });
  const motion = useRef(createAvatarMotionState()).current;

  useFrame((_, delta) => {
    const g = group.current;
    if (!g) return;
    if (!net.sampleRemote(id, performance.now() - INTERP_DELAY_MS, s)) return;
    // Posado sobre el relieve (M2): misma altura determinista que ve el jugador local.
    const y = terrainHeight(s.x, s.z);
    if (!inited.current) {
      g.position.set(s.x, y, s.z);
      prev.current.set(s.x, y, s.z);
      inited.current = true;
      return;
    }
    const dx = s.x - prev.current.x;
    const dz = s.z - prev.current.z;
    const moving = dx * dx + dz * dz > 1e-7;
    const vx = delta > 0 ? dx / delta : 0;
    const vz = delta > 0 ? dz / delta : 0;
    g.position.set(s.x, y, s.z);
    prev.current.set(s.x, y, s.z);
    // Giro con damping + bob/lean/manto/chispa — misma marcha que el avatar local (M3).
    stepAvatarMotion(
      motion,
      parts.current,
      vx,
      vz,
      moving ? Math.atan2(dx, dz) : null,
      delta,
      prefersReducedMotion(),
    );
  });

  return (
    <group
      ref={(g) => {
        group.current = g;
        parts.current.outer = g;
      }}
    >
      <AvatarMesh cloakColor={accentColor} partsRef={parts} />
      {handle ? (
        <Html position={[0, 2.6, 0]} center distanceFactor={11}>
          <Nameplate name={handle} accentColor={accentColor} />
        </Html>
      ) : null}
    </group>
  );
}

export default function RemotePlayers() {
  const { remotes } = useNetState();
  return (
    <>
      {remotes.map((r) => (
        <RemoteAvatar key={r.id} id={r.id} handle={r.handle} accentColor={r.accentColor} />
      ))}
    </>
  );
}
