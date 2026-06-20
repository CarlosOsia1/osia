'use client';

import { useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { LineBasicNodeMaterial } from 'three/webgpu';
import { uniform, attribute, vec3, vec2, sin, cos, float } from 'three/tsl';
import { precipKind } from '@osia/atmosphere';
import { world, atmo } from './atmosphereRuntime';
import { RAIN, SAND, FX_BOX } from './weatherConfig';

/**
 * RainStreaks (S0.7 v3) — lluvia y arena como STREAKS, simuladas EN GPU. Cada gota es un
 * segmento de línea cuya posición la calcula el SHADER (positionNode TSL) desde un uniform
 * de tiempo + atributos por-vértice (semilla/velocidad/fase) + uniforms por clima
 * (velocidad, dirección del streak, wobble). La CPU ya NO recorre 25k segmentos/frame;
 * solo cambia unos uniforms. Caja que sigue a la cámara; wrap en el shader. Color día↔noche.
 *
 * ⚙️ Config (cantidad, velocidad, largo, color…) en weatherConfig.ts.
 */

const COUNT = Math.max(RAIN.count, SAND.count); // buffer compartido (el mayor)
const RAIN_DAY = new THREE.Color(RAIN.colorDay);
const RAIN_NIGHT = new THREE.Color(RAIN.colorNight);
const SAND_DAY = new THREE.Color(SAND.colorDay);
const SAND_NIGHT = new THREE.Color(SAND.colorNight);

export default function RainStreaks() {
  const camera = useThree((s) => s.camera);
  const timeU = useMemo(() => uniform(0), []);
  const velU = useMemo(() => uniform(new THREE.Vector3()), []); // velocidad por clima
  const segU = useMemo(() => uniform(new THREE.Vector3()), []); // offset punta del streak
  const wobU = useMemo(() => uniform(new THREE.Vector3()), []); // amplitud de wobble
  const colU = useMemo(() => uniform(new THREE.Color('#b3c2da')), []);
  const tmpCol = useMemo(() => new THREE.Color(), []);

  const lines = useMemo(() => {
    // Geometría: COUNT segmentos = COUNT*2 vértices. Atributos por-vértice (semilla):
    // A y B de un segmento comparten seed/rand; difieren en aSide (0=base, 1=punta).
    const seed = new Float32Array(COUNT * 2 * 3);
    const rand = new Float32Array(COUNT * 2 * 2); // x=velocidad, y=fase
    const sideArr = new Float32Array(COUNT * 2);
    for (let i = 0; i < COUNT; i++) {
      const bx = (Math.random() * 2 - 1) * FX_BOX;
      const by = (Math.random() * 2 - 1) * FX_BOX;
      const bz = (Math.random() * 2 - 1) * FX_BOX;
      const sp = 0.7 + Math.random() * 0.6;
      const ph = Math.random() * Math.PI * 2;
      for (let v = 0; v < 2; v++) {
        const j = i * 2 + v;
        seed[j * 3] = bx;
        seed[j * 3 + 1] = by;
        seed[j * 3 + 2] = bz;
        rand[j * 2] = sp;
        rand[j * 2 + 1] = ph;
        sideArr[j] = v; // 0 base, 1 punta
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(COUNT * 2 * 3), 3)); // dummy (lo define positionNode)
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 3));
    geo.setAttribute('aRand', new THREE.BufferAttribute(rand, 2));
    geo.setAttribute('aSide', new THREE.BufferAttribute(sideArr, 1));

    const mat = new LineBasicNodeMaterial();
    mat.transparent = true;
    mat.depthWrite = false;
    mat.fog = false;
    mat.colorNode = colU;

    // --- simulación EN GPU ---
    const B = float(FX_BOX);
    const B2 = float(FX_BOX * 2);
    const seedN = attribute('aSeed', 'vec3') as unknown as ReturnType<typeof vec3>;
    const randN = attribute('aRand', 'vec2') as unknown as ReturnType<typeof vec2>;
    const side = attribute('aSide', 'float') as unknown as ReturnType<typeof float>;
    const sp = randN.x;
    const ph = randN.y;
    // base animada (semilla + velocidad·sp·tiempo) con WRAP por eje en [-B, B)
    const animated = seedN.add(velU.mul(sp).mul(timeU));
    const base = animated.add(B).mod(B2).sub(B);
    // wobble (orgánico) fuera del wrap, y la punta del streak por aSide
    const wob = vec3(
      sin(timeU.mul(4).add(ph)).mul(wobU.x),
      sin(timeU.mul(3).add(ph.mul(1.3))).mul(wobU.y),
      cos(timeU.mul(2.3).add(ph)).mul(wobU.z),
    );
    mat.positionNode = base.add(wob).add(segU.mul(side));

    const seg = new THREE.LineSegments(geo, mat);
    seg.frustumCulled = false;
    seg.visible = false;
    return seg;
  }, [timeU, velU, segU, wobU, colU]);

  useFrame((_, delta) => {
    const kind = precipKind(world.weather);
    if (kind !== 'rain' && kind !== 'sand') {
      lines.visible = false;
      return;
    }
    lines.visible = true;
    lines.position.copy(camera.position);
    timeU.value += delta; // ← único trabajo de CPU por frame
    const isRain = kind === 'rain';
    const night = atmo.current.starsIntensity; // 0 día → 1 noche

    if (isRain) {
      velU.value.set(0, -RAIN.fall, 0);
      segU.value.set(0, RAIN.len, 0);
      wobU.value.set(0.25, 0, 0);
      colU.value.copy(RAIN_DAY).lerp(tmpCol.copy(RAIN_NIGHT), night);
    } else {
      velU.value.set(SAND.speed, 0, 0);
      segU.value.set(-SAND.len, 0, 0);
      wobU.value.set(3, 1.4, 2);
      colU.value.copy(SAND_DAY).lerp(tmpCol.copy(SAND_NIGHT), night);
    }
    const mat = lines.material as LineBasicNodeMaterial;
    mat.opacity = (isRain ? RAIN.opacity : SAND.opacity) * Math.min(1, world.weather.intensity * 1.3);
    lines.geometry.setDrawRange(0, (isRain ? RAIN.count : SAND.count) * 2);
  });

  useEffect(
    () => () => {
      lines.geometry.dispose();
      (lines.material as THREE.Material).dispose();
    },
    [lines],
  );

  return <primitive object={lines} />;
}
