'use client';

import { Canvas } from '@react-three/fiber';
import { KeyboardControls, type KeyboardControlsEntry } from '@react-three/drei';
import { useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { WebGPURenderer } from 'three/webgpu';
import { Scene } from './Scene';
import Starfield from './Starfield';
import AtmosphereFX from './AtmosphereFX';
import PerfProbe from './PerfProbe';
import Player, { type Controls } from './Player';
import RemotePlayers from './RemotePlayers';
import { getNetClient } from '../net/useNet';

/** Conecta/desconecta el cliente de red al montar/desmontar el mundo. */
function WorldNet() {
  useEffect(() => {
    const net = getNetClient();
    net.connect();
    return () => net.disconnect();
  }, []);
  return null;
}

/**
 * WorldCanvas — el lienzo R3F de EL MUNDO (OSIA-S0.3, "El Cuerpo").
 *
 * WebGPU-native con fallback automático a WebGL2 (lo decide el WebGPURenderer).
 * Mundo low-poly celestial recorrible A PIE: avatar + cámara orbital de seguimiento
 * (WASD/flechas para caminar, arrastrar para mirar), niebla ónix, cielo estrellado
 * node-based, post-procesado TSL y HUD de perf. Base sobre la que se montará la
 * presencia multijugador (S0.5) y el Motor de Atmósfera server-authoritative (S0.7).
 */
export default function WorldCanvas() {
  const map = useMemo<KeyboardControlsEntry<Controls>[]>(
    () => [
      { name: 'forward', keys: ['ArrowUp', 'KeyW'] },
      { name: 'back', keys: ['ArrowDown', 'KeyS'] },
      { name: 'left', keys: ['ArrowLeft', 'KeyA'] },
      { name: 'right', keys: ['ArrowRight', 'KeyD'] },
    ],
    [],
  );

  return (
    <KeyboardControls map={map}>
      <WorldNet />
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [6, 4, 13], fov: 50, near: 0.1, far: 200 }}
        gl={async (props) => {
          // WebGPU si está disponible; si no, WebGPURenderer cae solo a WebGL2.
          const renderer = new WebGPURenderer(
            props as unknown as ConstructorParameters<typeof WebGPURenderer>[0],
          );
          renderer.toneMapping = THREE.ACESFilmicToneMapping;
          renderer.toneMappingExposure = 1.1;
          await renderer.init(); // imprescindible: sin esto el render falla en silencio.
          return renderer;
        }}
        onCreated={({ scene }) => {
          // Crepúsculo→noche celestial: cielo ónix profundo + niebla marfil tenue.
          scene.background = new THREE.Color('#14120f');
          scene.fog = new THREE.FogExp2('#1b1814', 0.028);
        }}
      >
        <Scene />
        <Player />
        <RemotePlayers />
        <Starfield count={1600} radius={120} />
        {/* Post-procesado TSL: toma el control del render (debe ir al final). */}
        <AtmosphereFX />
        {/* Muestreo de rendimiento (priority 2: corre tras el render). */}
        <PerfProbe />
      </Canvas>
    </KeyboardControls>
  );
}
