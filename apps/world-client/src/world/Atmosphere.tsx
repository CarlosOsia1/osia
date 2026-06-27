'use client';

import { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { fog, positionView, positionWorld, uniform } from 'three/tsl';
import { resolveAtmosphere, applyWeather, applySeason, resolveSeasonTints, biomeById } from '@osia/atmosphere';
import { atmo, world, tickWeatherDisplay } from './atmosphereRuntime';
import { worldClock, tickWorldClock } from './worldClockRuntime';
import { tickAtmoHud } from './atmoHudBus';
import { FOG } from './weatherConfig';

/**
 * Atmosphere (S0.7 v3) — el cielo vivo. Cada frame: avanza el reloj, resuelve el
 * preset del BIOMA según la hora, aplica el CLIMA, y lo traduce al render (cielo,
 * niebla, sol, luna, ambiente, exposición). Escribe el bus `atmo`. Provee las luces.
 *
 * NIEBLA = HEIGHT FOG volumétrico (TSL, scene-wide vía `scene.fogNode`). En vez del
 * fog lineal por distancia (que sobre un suelo PLANO deja una "línea" dura en el
 * horizonte: piso oscuro vs cielo claro), la niebla llena el AIRE por altura: densa
 * pegada al suelo, se aclara hacia arriba. Así ENVUELVE al jugador como una esfera,
 * sin costura, y se funde con el cielo (el color del fog = horizonte del cielo).
 * Solo aparece con clima de niebla/arena; en despejado la fuerza ≈ 0 (mundo limpio).
 */

const SUN_DIST = 70;
const MOON_DIST = 70;

// Color del height fog para climas de BAJA altura (no llegan al horizonte, así que
// pueden tener color propio sin costura): lluvia gris, nieve blanca. (Ver weatherConfig.)
const FOG_RAIN = new THREE.Color(FOG.rain.color);
const FOG_SNOW = new THREE.Color(FOG.snow.color);
// Relleno ambiente azul-lunar: de noche el ambientColor del preset es casi negro, así
// que subir solo la intensidad no alcanza; lo lerpeamos hacia este tono para "ver".
const MOONLIT = new THREE.Color('#34405c');

export default function Atmosphere() {
  const scene = useThree((s) => s.scene);
  const gl = useThree((s) => s.gl);
  const sun = useRef<THREE.DirectionalLight>(null);
  const moon = useRef<THREE.DirectionalLight>(null);
  const ambient = useRef<THREE.AmbientLight>(null);
  const bg = useRef(new THREE.Color()).current;

  // Uniforms del height fog (se crean una vez; se animan cada frame).
  const fogU = useMemo(
    () => ({
      color: uniform(new THREE.Color(0xffffff)),
      strength: uniform(0), // 0 despejado → 1 niebla/arena
      height: uniform(38), // hasta qué altura (m) llega la niebla; se aclara arriba
      dist: uniform(24), // a cuántos m alcanza fog pleno hacia el frente
    }),
    [],
  );

  // Monta el fogNode volumétrico una sola vez.
  useEffect(() => {
    const depth = positionView.z.negate(); // distancia al frente (view-space, +)
    const distFactor = depth.div(fogU.dist).saturate(); // 0 cerca → 1 a `dist` m
    // Denso pegado al suelo (y=0 → 1), se aclara hacia arriba (y=height → 0). Al
    // cuadrado: concentra la niebla abajo sin hacer una pared plana.
    const heightBase = fogU.height.sub(positionWorld.y).div(fogU.height).saturate();
    const factor = heightBase.mul(heightBase).mul(distFactor).mul(fogU.strength).saturate();
    scene.fogNode = fog(fogU.color, factor);
    scene.fog = null; // el fogNode reemplaza al fog lineal
    return () => {
      scene.fogNode = null;
    };
  }, [scene, fogU]);

  useFrame((_, delta) => {
    tickWorldClock(delta);
    tickWeatherDisplay(delta); // rampa suave del clima hacia el objetivo (override ?? server)
    const biome = biomeById(world.biomeId);
    // Pipeline: preset por hora → tinte lento de la ESTACIÓN (S2-B1) → CLIMA efímero. La
    // estación se deriva del mismo reloj (worldClock.toy); no toca la transición de clima. El
    // tinte del SUELO/VEGETACIÓN lo aplica la escena (Scene) con el mismo timeOfYear.
    const base = applySeason(resolveAtmosphere(worldClock.tod, biome.cycle), resolveSeasonTints(worldClock.toy).sky);
    const p = applyWeather(base, world.weather);
    atmo.current = p;
    tickAtmoHud(p, performance.now()); // el HUD respira el cielo (S2-A1); throttled, sin re-render

    // Piso de luz LUNAR: la noche nunca es oscuridad TOTAL — la luna ilumina un poco
    // (no mucho). Sube la luna direccional y el relleno ambiente según lo "noche" que sea.
    const nightAmt = THREE.MathUtils.clamp(p.starsIntensity, 0, 1); // 0 día → 1 noche
    const moonI = Math.max(p.moonIntensity, 1.15 * nightAmt);
    const ambI = Math.max(p.ambientIntensity, 0.4 + 0.2 * nightAmt);

    bg.setRGB(p.skyHorizon[0], p.skyHorizon[1], p.skyHorizon[2], THREE.SRGBColorSpace);
    scene.background = bg;

    // Volumen de height fog por clima:
    //  · niebla/arena → ALTO, color = horizonte del cielo (cero costura)
    //  · lluvia → gris y MUY baja · nieve → blanca y baja · despejado → nada
    const wk = world.weather.kind;
    const wi = world.weather.intensity;
    // Igual que niebla/arena: el fog de lluvia/nieve se oscurece de noche (no glow).
    const day = 0.45 + 0.55 * (1 - THREE.MathUtils.clamp(p.starsIntensity, 0, 1));
    if (wk === 'lluvia') {
      fogU.strength.value = FOG.rain.strength * wi;
      fogU.height.value = FOG.rain.height; // súper baja: neblina gris pegada al suelo
      fogU.color.value.copy(FOG_RAIN).multiplyScalar(day);
    } else if (wk === 'nieve') {
      fogU.strength.value = FOG.snow.strength * wi;
      fogU.height.value = FOG.snow.height; // baja: bruma blanca de nevada
      fogU.color.value.copy(FOG_SNOW).multiplyScalar(day);
    } else if (wk === 'niebla') {
      // color = horizonte del cielo (= fondo) → cero costura. Densidad que se DEGRADA
      // suave de día (0.4) a medianoche (1.0) según `nightAmt` (más espesa de madrugada).
      fogU.strength.value =
        THREE.MathUtils.lerp(FOG.niebla.strengthDay, FOG.niebla.strengthNight, nightAmt) * wi;
      fogU.height.value = FOG.niebla.height;
      fogU.color.value.setRGB(p.skyHorizon[0], p.skyHorizon[1], p.skyHorizon[2], THREE.SRGBColorSpace);
    } else if (wk === 'tormenta-arena') {
      fogU.strength.value = FOG.sand.strength * wi;
      fogU.height.value = FOG.sand.height;
      fogU.color.value.setRGB(p.skyHorizon[0], p.skyHorizon[1], p.skyHorizon[2], THREE.SRGBColorSpace);
    } else {
      // despejado — sin niebla.
      fogU.strength.value = 0;
    }

    if (sun.current) {
      sun.current.position.set(p.sunDir[0] * SUN_DIST, p.sunDir[1] * SUN_DIST, p.sunDir[2] * SUN_DIST);
      sun.current.color.setRGB(p.sunColor[0], p.sunColor[1], p.sunColor[2], THREE.SRGBColorSpace);
      sun.current.intensity = p.sunIntensity;
      sun.current.visible = p.sunIntensity > 0.001;
    }
    if (moon.current) {
      moon.current.position.set(p.moonDir[0] * MOON_DIST, p.moonDir[1] * MOON_DIST, p.moonDir[2] * MOON_DIST);
      moon.current.color.setRGB(p.moonColor[0], p.moonColor[1], p.moonColor[2], THREE.SRGBColorSpace);
      moon.current.intensity = moonI;
      moon.current.visible = moonI > 0.001;
    }
    if (ambient.current) {
      ambient.current.color.setRGB(p.ambientColor[0], p.ambientColor[1], p.ambientColor[2], THREE.SRGBColorSpace);
      ambient.current.color.lerp(MOONLIT, nightAmt * 0.5); // de noche, relleno azul lunar (no negro)
      ambient.current.intensity = ambI;
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
