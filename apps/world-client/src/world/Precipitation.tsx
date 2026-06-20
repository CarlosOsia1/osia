'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { precipKind } from '@osia/atmosphere';
import { world } from './atmosphereRuntime';
import { SNOW, FX_BOX } from './weatherConfig';

/**
 * Precipitation (S0.7 v4) — NIEVE como InstancedMesh de blobs low-poly.
 *
 * IMPORTANTE: en WebGPU los `THREE.Points` rasterizan SIEMPRE a 1 píxel (no existe
 * `gl_PointSize`), así que el tamaño de los puntos NO se puede cambiar. Por eso la
 * nieve se dibuja como instancias 3D reales (icosaedros pequeños): el tamaño se
 * respeta, varía por copo, y la perspectiva atenúa los lejanos. Encaja con el low-poly.
 *
 * La lluvia/arena las dibuja RainStreaks (líneas). La niebla la hace el height-fog
 * volumétrico (Atmosphere), no partículas.
 *
 * ⚙️ Toda la configuración (cantidad, tamaño, velocidad…) está en weatherConfig.ts.
 * Caja que SIGUE a la cámara; reciclado por wrap en los 3 ejes (nevada infinita).
 */

export default function Precipitation() {
  const camera = useThree((s) => s.camera);
  const tRef = useRef(0);

  const snow = useMemo(() => {
    const geo = new THREE.IcosahedronGeometry(SNOW.size, 0); // blob low-poly
    const mat = new THREE.MeshBasicMaterial({
      color: SNOW.color,
      transparent: true,
      opacity: SNOW.opacity,
      depthWrite: false,
      fog: false,
    });
    const mesh = new THREE.InstancedMesh(geo, mat, SNOW.count);
    mesh.frustumCulled = false;
    mesh.visible = false;

    // Estado por copo: offset (relativo a la caja), tamaño, fase y velocidad.
    const off = new Float32Array(SNOW.count * 3);
    const size = new Float32Array(SNOW.count);
    const phase = new Float32Array(SNOW.count);
    const speed = new Float32Array(SNOW.count);
    for (let i = 0; i < SNOW.count; i++) {
      off[i * 3] = (Math.random() * 2 - 1) * FX_BOX;
      off[i * 3 + 1] = (Math.random() * 2 - 1) * FX_BOX;
      off[i * 3 + 2] = (Math.random() * 2 - 1) * FX_BOX;
      size[i] = 0.6 + Math.random() * SNOW.sizeVar; // factor por copo (0.6×–2.0× por defecto)
      phase[i] = Math.random() * Math.PI * 2;
      speed[i] = 0.6 + Math.random() * 0.8;
    }
    return { mesh, off, size, phase, speed, dummy: new THREE.Object3D() };
  }, []);

  useFrame((_, delta) => {
    const kind = precipKind(world.weather);
    if (kind !== 'snow') {
      snow.mesh.visible = false;
      return;
    }
    snow.mesh.visible = true;
    snow.mesh.position.copy(camera.position); // la caja sigue a la cámara
    tRef.current += delta;
    const t = tRef.current;

    const { off, size, phase, speed, dummy, mesh } = snow;
    (mesh.material as THREE.MeshBasicMaterial).opacity =
      SNOW.opacity * Math.min(1, world.weather.intensity * 1.2);

    for (let i = 0; i < SNOW.count; i++) {
      const o = i * 3;
      const ph = phase[i] ?? 0;
      const sp = speed[i] ?? 1;
      let x = off[o] ?? 0;
      let y = off[o + 1] ?? 0;
      let z = off[o + 2] ?? 0;

      y -= SNOW.fall * sp * delta;
      x += (Math.sin(t * 1.4 + ph) * 1.5 + SNOW.drift) * delta; // sway + viento
      z += Math.cos(t * 1.1 + ph * 1.7) * 1.5 * delta;

      if (y < -FX_BOX) {
        y += FX_BOX * 2;
        x = (Math.random() * 2 - 1) * FX_BOX;
        z = (Math.random() * 2 - 1) * FX_BOX;
      } else if (y > FX_BOX) {
        y -= FX_BOX * 2;
      }
      if (x > FX_BOX) x -= FX_BOX * 2;
      else if (x < -FX_BOX) x += FX_BOX * 2;
      if (z > FX_BOX) z -= FX_BOX * 2;
      else if (z < -FX_BOX) z += FX_BOX * 2;

      off[o] = x;
      off[o + 1] = y;
      off[o + 2] = z;

      dummy.position.set(x, y, z);
      dummy.scale.setScalar(size[i] ?? 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  useEffect(
    () => () => {
      snow.mesh.geometry.dispose();
      (snow.mesh.material as THREE.Material).dispose();
      snow.mesh.dispose();
    },
    [snow],
  );

  return <primitive object={snow.mesh} />;
}
