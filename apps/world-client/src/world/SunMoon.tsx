'use client';

import { useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { MeshBasicNodeMaterial } from 'three/webgpu';
import { atmo } from './atmosphereRuntime';

/**
 * SunMoon (S0.7 v2) — disco de SOL y LUNA visibles en el cielo, que se ven CRUZAR
 * con la hora. Esferas brillantes (sin fog, sin escribir profundidad) ancladas a
 * la dirección del astro; el bloom de AtmosphereFX las hace resplandecer. Quedan
 * ocultas tras los árboles (depthTest) y bajo el horizonte.
 */

const DIST = 165; // < domo (180) y < far de cámara (200)

function makeBody(radius: number): THREE.Mesh {
  const geo = new THREE.SphereGeometry(radius, 24, 16);
  const mat = new MeshBasicNodeMaterial();
  mat.fog = false;
  mat.depthWrite = false;
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  return mesh;
}

export default function SunMoon() {
  const camera = useThree((s) => s.camera);
  const sun = useMemo(() => makeBody(6), []);
  const moon = useMemo(() => makeBody(4.2), []);

  useFrame(() => {
    const p = atmo.current;
    const c = camera.position;

    const smat = sun.material as MeshBasicNodeMaterial;
    smat.color.setRGB(p.sunColor[0], p.sunColor[1], p.sunColor[2], THREE.SRGBColorSpace);
    sun.position.set(c.x + p.sunDir[0] * DIST, c.y + p.sunDir[1] * DIST, c.z + p.sunDir[2] * DIST);
    sun.visible = p.sunIntensity > 0.02 && p.sunDir[1] > -0.08;

    const mmat = moon.material as MeshBasicNodeMaterial;
    mmat.color.setRGB(p.moonColor[0], p.moonColor[1], p.moonColor[2], THREE.SRGBColorSpace);
    moon.position.set(c.x + p.moonDir[0] * DIST, c.y + p.moonDir[1] * DIST, c.z + p.moonDir[2] * DIST);
    moon.visible = p.moonIntensity > 0.02 && p.moonDir[1] > -0.08;
  });

  useEffect(
    () => () => {
      sun.geometry.dispose();
      (sun.material as THREE.Material).dispose();
      moon.geometry.dispose();
      (moon.material as THREE.Material).dispose();
    },
    [sun, moon],
  );

  return (
    <>
      <primitive object={sun} />
      <primitive object={moon} />
    </>
  );
}
