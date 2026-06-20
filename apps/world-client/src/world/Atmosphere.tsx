'use client';

import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { resolveAtmosphere, applyWeather, biomeById } from '@osia/atmosphere';
import { atmo, world } from './atmosphereRuntime';
import { worldClock, tickWorldClock } from './worldClockRuntime';

/**
 * Atmosphere (S0.7 v2) — el cielo vivo. Cada frame: avanza el reloj, resuelve el
 * preset del BIOMA actual según la hora, aplica el CLIMA, y lo traduce al render
 * (cielo, niebla, sol que se mueve, luna, ambiente, exposición). Escribe el bus
 * `atmo` para que SkyDome / estrellas / partículas reaccionen. Provee las luces.
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

  useFrame((_, delta) => {
    tickWorldClock(delta);
    const biome = biomeById(world.biomeId);
    const p = applyWeather(resolveAtmosphere(worldClock.tod, biome.cycle), world.weather);
    atmo.current = p;

    bg.setRGB(p.skyHorizon[0], p.skyHorizon[1], p.skyHorizon[2], THREE.SRGBColorSpace);
    scene.background = bg;
    // Niebla LINEAL (near/far): solo aparece a partir de `near` y llena en `far`.
    // Despejado (densidad baja) → empieza muy lejos (~90 m) = nada de niebla cerca;
    // niebla/tormenta (densidad alta) → se acerca. Más realista que FogExp2.
    if (!(scene.fog instanceof THREE.Fog)) scene.fog = new THREE.Fog(0x000000, 60, 250);
    const fog = scene.fog as THREE.Fog;
    fog.color.setRGB(p.fogColor[0], p.fogColor[1], p.fogColor[2], THREE.SRGBColorSpace);
    // Despejado → la niebla arranca lejísimos (~350 m: nada de bruma cerca); niebla/
    // tormenta → se acerca. Mapeo NO lineal densidad → distancia de inicio (`near`).
    const near = THREE.MathUtils.clamp(0.22 / Math.pow(Math.max(p.fogDensity, 0.001), 1.44), 12, 500);
    fog.near = near;
    fog.far = near * 1.9;

    if (sun.current) {
      sun.current.position.set(p.sunDir[0] * SUN_DIST, p.sunDir[1] * SUN_DIST, p.sunDir[2] * SUN_DIST);
      sun.current.color.setRGB(p.sunColor[0], p.sunColor[1], p.sunColor[2], THREE.SRGBColorSpace);
      sun.current.intensity = p.sunIntensity;
      sun.current.visible = p.sunIntensity > 0.001;
    }
    if (moon.current) {
      moon.current.position.set(p.moonDir[0] * MOON_DIST, p.moonDir[1] * MOON_DIST, p.moonDir[2] * MOON_DIST);
      moon.current.color.setRGB(p.moonColor[0], p.moonColor[1], p.moonColor[2], THREE.SRGBColorSpace);
      moon.current.intensity = p.moonIntensity;
      moon.current.visible = p.moonIntensity > 0.001;
    }
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
