'use client';

import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { getNetClient } from '../net/useNet';
import { meshVoice } from '../voice/MeshVoice';
import { spatialGraph } from '../voice/SpatialGraph';

/**
 * VoiceDriver (S0.6) — sin render. Cada frame mueve el listener (cámara) y los panners
 * (posiciones interpoladas, las MISMAS que los avatares remotos → audio coherente). Cada
 * ~300 ms recalcula el gating de proximidad + cap top-N (no a 20Hz: thrashea SDP/ICE).
 */

const HEAD_Y = 1.6; // altura de la "boca" del avatar remoto

export default function VoiceDriver() {
  const camera = useThree((s) => s.camera);
  const net = useRef(getNetClient()).current;
  const fwd = useRef(new THREE.Vector3()).current;
  const up = useRef(new THREE.Vector3()).current;
  const acc = useRef(0);

  useFrame((_, delta) => {
    if (!spatialGraph.ready) return;

    // Listener desde la cámara (Web Audio y R3F comparten right-handed, -Z forward).
    camera.getWorldDirection(fwd);
    up.set(0, 1, 0).applyQuaternion(camera.quaternion);
    spatialGraph.setListener(
      camera.position.x, camera.position.y, camera.position.z,
      fwd.x, fwd.y, fwd.z,
      up.x, up.y, up.z,
    );

    const self = net.serverSelf;
    const renderTime = performance.now() - 100;
    for (const id of net.getRemoteIds()) {
      const s = net.sampleRemote(id, renderTime);
      if (!s) continue;
      const dist = self ? Math.hypot(s.x - self.x, s.z - self.z) : 0;
      spatialGraph.setPeerPosition(id, s.x, HEAD_Y, s.z, dist);
    }

    // Gating de proximidad cada ~300 ms.
    acc.current += delta;
    if (acc.current >= 0.3 && self) {
      acc.current = 0;
      const ranked = net
        .getRemoteIds()
        .map((id) => {
          const s = net.sampleRemote(id, renderTime);
          return s ? { id, dist: Math.hypot(s.x - self.x, s.z - self.z) } : null;
        })
        .filter((x): x is { id: number; dist: number } => x !== null)
        .sort((a, b) => a.dist - b.dist);
      meshVoice.updateNeighbors(ranked);
    }
  });

  return null;
}
