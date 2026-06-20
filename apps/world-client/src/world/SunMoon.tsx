'use client';

import { useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { MeshBasicNodeMaterial } from 'three/webgpu';
import { atmo } from './atmosphereRuntime';

/**
 * SunMoon (S0.7 v2) — disco de SOL y LUNA visibles que cruzan el cielo con la hora,
 * + un HALO propio del sol (resplandor suave) que reemplaza al bloom de pantalla
 * (Carlos no quiere bloom). El halo brilla un poco más al amanecer/atardecer.
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

/** Textura radial suave (blanco al centro → transparente) para el halo. */
function makeGlowTexture(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.22, 'rgba(255,255,255,0.5)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export default function SunMoon() {
  const camera = useThree((s) => s.camera);
  const sun = useMemo(() => makeBody(3.6), []);
  const moon = useMemo(() => makeBody(3.6), []);
  const halo = useMemo(() => {
    const mat = new MeshBasicNodeMaterial();
    mat.map = makeGlowTexture();
    mat.transparent = true;
    mat.depthWrite = false;
    mat.fog = false;
    mat.blending = THREE.AdditiveBlending;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
    m.frustumCulled = false;
    return m;
  }, []);

  useFrame(() => {
    const p = atmo.current;
    const c = camera.position;

    const smat = sun.material as MeshBasicNodeMaterial;
    smat.color.setRGB(p.sunColor[0], p.sunColor[1], p.sunColor[2], THREE.SRGBColorSpace);
    sun.position.set(c.x + p.sunDir[0] * DIST, c.y + p.sunDir[1] * DIST, c.z + p.sunDir[2] * DIST);
    sun.visible = p.sunIntensity > 0.02 && p.sunDir[1] > -0.08;

    // halo del sol: resplandor aditivo, más fuerte al amanecer/atardecer (proxy: bloom)
    const glowK = 0.18 + p.bloom * 0.38;
    const hmat = halo.material as MeshBasicNodeMaterial;
    hmat.color.setRGB(p.sunColor[0] * glowK, p.sunColor[1] * glowK, p.sunColor[2] * glowK, THREE.SRGBColorSpace);
    halo.position.copy(sun.position);
    halo.lookAt(c);
    halo.scale.setScalar(34);
    halo.visible = sun.visible;

    const mmat = moon.material as MeshBasicNodeMaterial;
    mmat.color.setRGB(p.moonColor[0], p.moonColor[1], p.moonColor[2], THREE.SRGBColorSpace);
    moon.position.set(c.x + p.moonDir[0] * DIST, c.y + p.moonDir[1] * DIST, c.z + p.moonDir[2] * DIST);
    moon.visible = p.moonIntensity > 0.02 && p.moonDir[1] > -0.08;
  });

  useEffect(
    () => () => {
      for (const m of [sun, moon, halo]) {
        m.geometry.dispose();
        const mt = m.material as MeshBasicNodeMaterial & { map?: THREE.Texture | null };
        mt.map?.dispose();
        mt.dispose();
      }
    },
    [sun, moon, halo],
  );

  return (
    <>
      <primitive object={sun} />
      <primitive object={halo} />
      <primitive object={moon} />
    </>
  );
}
