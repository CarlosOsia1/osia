'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { Scene } from './Scene';

/**
 * WorldCanvas — el lienzo R3F de EL MUNDO (OSIA-S0.2, "Primera Luz").
 *
 * Escena estática celestial low-poly: niebla ónix, cielo profundo, luz champán,
 * estrellas y OrbitControls para mirar alrededor. Es la base de render sobre la
 * que se montará el avatar (S0.3) y el Motor de Atmósfera (S0.7).
 */
export default function WorldCanvas() {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [9, 5, 12], fov: 50, near: 0.1, far: 200 }}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1 }}
      onCreated={({ scene }) => {
        // Crepúsculo→noche celestial: cielo ónix profundo + niebla marfil tenue.
        scene.background = new THREE.Color('#14120f');
        scene.fog = new THREE.FogExp2('#1b1814', 0.028);
      }}
    >
      <Scene />
      <Stars radius={120} depth={60} count={1600} factor={4} saturation={0} fade speed={0.4} />
      <OrbitControls
        enableDamping
        dampingFactor={0.08}
        target={[0, 1.2, 0]}
        minDistance={4}
        maxDistance={40}
        maxPolarAngle={Math.PI / 2.05}
      />
    </Canvas>
  );
}
