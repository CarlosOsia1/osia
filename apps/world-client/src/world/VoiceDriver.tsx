'use client';

import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { getNetClient } from '../net/useNet';
import { INTERP_DELAY_MS } from '../net/config';
import type { Sample } from '../net/NetClient';
import { meshVoice } from '../voice/MeshVoice';
import { spatialGraph } from '../voice/SpatialGraph';

/**
 * VoiceDriver (S0.6) — sin render. Cada frame mueve el listener (cámara) y los panners
 * (posiciones interpoladas, las MISMAS que los avatares remotos → audio coherente). Cada
 * ~300 ms recalcula el gating de proximidad + cap top-N (no a 20Hz: thrashea SDP/ICE).
 */

const HEAD_Y = 1.6; // altura de la "boca" del avatar remoto
const NEIGHBOR_INTERVAL_S = 0.3; // recálculo del gating de proximidad

export default function VoiceDriver() {
  const camera = useThree((s) => s.camera);
  const net = useRef(getNetClient()).current;
  const fwd = useRef(new THREE.Vector3()).current;
  const up = useRef(new THREE.Vector3()).current;
  const acc = useRef(0);
  // Buffers reutilizados (cero asignaciones por frame, §7): la muestra y el array de vecinos
  // con sus entradas se reescriben en sitio en vez de crear objetos nuevos a 60 fps.
  const sample = useRef<Sample>({ t: 0, x: 0, z: 0, yaw: 0 }).current;
  const frame = useRef<{ id: number; dist: number }[]>([]).current;

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
    const renderTime = performance.now() - INTERP_DELAY_MS;
    let n = 0;
    for (const id of net.remoteIds()) {
      if (!net.sampleRemote(id, renderTime, sample)) continue;
      const dist = self ? Math.hypot(sample.x - self.x, sample.z - self.z) : 0;
      spatialGraph.setPeerPosition(id, sample.x, HEAD_Y, sample.z, dist);
      const e = frame[n] ?? (frame[n] = { id: 0, dist: 0 });
      e.id = id;
      e.dist = dist;
      n++;
    }

    // Gating de proximidad cada ~300 ms (reusa las distancias ya calculadas este frame).
    acc.current += delta;
    if (acc.current >= NEIGHBOR_INTERVAL_S && self) {
      acc.current = 0;
      meshVoice.updateNeighbors(frame.slice(0, n).sort((a, b) => a.dist - b.dist));
    }
  });

  return null;
}
