'use client';

import { useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { MeshBasicNodeMaterial } from 'three/webgpu';
import { uniform, positionLocal, normalize, mix, smoothstep, float } from 'three/tsl';
import { atmo } from './atmosphereRuntime';

/**
 * SkyDome (S0.7 v2 · quick win #1) — domo de cielo con GRADIENTE cenit→horizonte
 * (node/TSL, WebGPU). Pasa del "fondo plano de plato" a profundidad atmosférica
 * vertical. Lee skyTop/skyHorizon del bus `atmo` cada frame. Sigue a la cámara.
 * Radio < far de cámara (200) para no recortarse; sin escribir profundidad.
 */

const R = 180;

export default function SkyDome() {
  const camera = useThree((s) => s.camera);

  const topU = useMemo(() => uniform(new THREE.Color('#14120f')), []);
  const horU = useMemo(() => uniform(new THREE.Color('#1b1814')), []);

  const obj = useMemo(() => {
    const material = new MeshBasicNodeMaterial();
    const up = normalize(positionLocal).y; // -1..1 (dirección del domo)
    const t = smoothstep(float(-0.06), float(0.5), up);
    material.colorNode = mix(topU, horU, t.oneMinus()); // horizonte abajo, cenit arriba
    material.side = THREE.BackSide;
    material.depthWrite = false;
    material.fog = false;
    const geo = new THREE.SphereGeometry(R, 32, 16);
    const mesh = new THREE.Mesh(geo, material);
    mesh.frustumCulled = false;
    mesh.renderOrder = -1;
    return mesh;
  }, [topU, horU]);

  useFrame(() => {
    const p = atmo.current;
    topU.value.setRGB(p.skyTop[0], p.skyTop[1], p.skyTop[2], THREE.SRGBColorSpace);
    horU.value.setRGB(p.skyHorizon[0], p.skyHorizon[1], p.skyHorizon[2], THREE.SRGBColorSpace);
    obj.position.copy(camera.position);
  });

  useEffect(
    () => () => {
      obj.geometry.dispose();
      (obj.material as THREE.Material).dispose();
    },
    [obj],
  );

  return <primitive object={obj} />;
}
