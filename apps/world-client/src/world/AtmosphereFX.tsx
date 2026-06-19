'use client';

import { useEffect, useMemo } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { PostProcessing } from 'three/webgpu';
import { pass, mix, uv, smoothstep, float } from 'three/tsl';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { atmo } from './atmosphereRuntime';

/**
 * AtmosphereFX — post-procesado TSL (WebGPU-native): bloom suave sobre los acentos
 * + viñeta. El bloom es DINÁMICO: su fuerza la dicta `atmo.current.bloom` cada
 * frame (día contenido ~0.32, noche/atardecer florece ~0.8). Toma el control del
 * render (useFrame priority 1), por eso debe ser el único que pinta el frame.
 */

type BloomLike = { strength: { value: number } };

export default function AtmosphereFX() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);

  const { post, bloomPass } = useMemo(() => {
    const pp = new PostProcessing(gl as unknown as ConstructorParameters<typeof PostProcessing>[0]);
    const scenePass = pass(scene, camera);
    const bp = bloom(scenePass, 0.6, 0.35, 0.55);
    const dist = uv().sub(0.5).length();
    const vignette = smoothstep(0.32, 0.85, dist).oneMinus();
    const amount = float(0.55);
    pp.outputNode = scenePass.add(bp).mul(mix(float(1).sub(amount), float(1), vignette));
    return { post: pp, bloomPass: bp };
  }, [gl, scene, camera]);

  useFrame(() => {
    // bloom dinámico: la atmósfera dicta cuánto florece la luz.
    (bloomPass as unknown as BloomLike).strength.value = atmo.current.bloom;
    post.render();
  }, 1);

  useEffect(() => () => post.dispose(), [post]);

  return null;
}
