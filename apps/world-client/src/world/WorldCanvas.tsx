'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { WebGPURenderer } from 'three/webgpu';
import { Scene } from './Scene';
import Starfield from './Starfield';
import AtmosphereFX from './AtmosphereFX';
import PerfProbe from './PerfProbe';

/**
 * WorldCanvas — el lienzo R3F de EL MUNDO (OSIA-S0.2, "Primera Luz").
 *
 * WebGPU-native con fallback automático a WebGL2 (lo decide el WebGPURenderer).
 * Escena estática celestial low-poly: niebla ónix, cielo profundo, luz champán,
 * cielo estrellado node-based, OrbitControls y post-procesado TSL (AtmosphereFX).
 * Base de render sobre la que se montará el avatar (S0.3) y el Motor de Atmósfera
 * server-authoritative (S0.7).
 */
export default function WorldCanvas() {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [9, 5, 12], fov: 50, near: 0.1, far: 200 }}
      gl={async (props) => {
        // WebGPU si está disponible; si no, WebGPURenderer cae solo a WebGL2.
        const renderer = new WebGPURenderer(props as unknown as ConstructorParameters<typeof WebGPURenderer>[0]);
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
      <Starfield count={1600} radius={120} />
      <OrbitControls
        enableDamping
        dampingFactor={0.08}
        target={[0, 1.2, 0]}
        minDistance={4}
        maxDistance={40}
        maxPolarAngle={Math.PI / 2.05}
      />
      {/* Post-procesado TSL: toma el control del render (debe ir al final). */}
      <AtmosphereFX />
      {/* Muestreo de rendimiento (priority 2: corre tras el render). */}
      <PerfProbe />
    </Canvas>
  );
}
