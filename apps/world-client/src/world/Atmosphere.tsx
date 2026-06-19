'use client';

import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { resolveAtmosphere, timeOfDayAt, CELESTIAL_CYCLE } from '@osia/atmosphere';
import { atmo } from './atmosphereRuntime';

/**
 * Atmosphere (S0.7-H3/H4) — el cielo vivo. Cada frame resuelve el AtmosphereParams
 * desde un reloj DETERMINISTA (timeOfDay por Date.now → igual para todos) y lo
 * traduce al render: cielo, niebla, sol que SE MUEVE, luna, luz ambiental y
 * exposición. Escribe el bus `atmo` para que otros (estrellas) reaccionen.
 *
 * Provee las luces (antes estaban estáticas en Scene): SRP = Scene es geometría.
 */

const SUN_DIST = 70;
const MOON_DIST = 70;

export default function Atmosphere() {
  const scene = useThree((s) => s.scene);
  const gl = useThree((s) => s.gl);
  const sun = useRef<THREE.DirectionalLight>(null);
  const moon = useRef<THREE.DirectionalLight>(null);
  const ambient = useRef<THREE.AmbientLight>(null);
  const bg = useRef(new THREE.Color()).current;

  useFrame(() => {
    const p = resolveAtmosphere(timeOfDayAt(Date.now()), CELESTIAL_CYCLE);
    atmo.current = p;

    // cielo (fondo) + niebla
    bg.setRGB(p.skyHorizon[0], p.skyHorizon[1], p.skyHorizon[2], THREE.SRGBColorSpace);
    scene.background = bg;
    if (scene.fog instanceof THREE.FogExp2) {
      scene.fog.color.setRGB(p.fogColor[0], p.fogColor[1], p.fogColor[2], THREE.SRGBColorSpace);
      scene.fog.density = p.fogDensity;
    }

    // sol (se mueve con la hora) — la luz viene desde sunDir hacia el origen
    if (sun.current) {
      sun.current.position.set(p.sunDir[0] * SUN_DIST, p.sunDir[1] * SUN_DIST, p.sunDir[2] * SUN_DIST);
      sun.current.color.setRGB(p.sunColor[0], p.sunColor[1], p.sunColor[2], THREE.SRGBColorSpace);
      sun.current.intensity = p.sunIntensity;
      sun.current.visible = p.sunIntensity > 0.001;
    }
    // luna (arriba de noche)
    if (moon.current) {
      moon.current.position.set(p.moonDir[0] * MOON_DIST, p.moonDir[1] * MOON_DIST, p.moonDir[2] * MOON_DIST);
      moon.current.color.setRGB(p.moonColor[0], p.moonColor[1], p.moonColor[2], THREE.SRGBColorSpace);
      moon.current.intensity = p.moonIntensity;
      moon.current.visible = p.moonIntensity > 0.001;
    }
    // ambiente + exposición
    if (ambient.current) {
      ambient.current.color.setRGB(p.ambientColor[0], p.ambientColor[1], p.ambientColor[2], THREE.SRGBColorSpace);
      ambient.current.intensity = p.ambientIntensity;
    }
    gl.toneMappingExposure = p.exposure;
  });

  return (
    <>
      <ambientLight ref={ambient} />
      <directionalLight
        ref={sun}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0004}
        shadow-camera-near={0.5}
        shadow-camera-far={200}
        shadow-camera-left={-24}
        shadow-camera-right={24}
        shadow-camera-top={24}
        shadow-camera-bottom={-24}
      />
      <directionalLight ref={moon} />
    </>
  );
}
