'use client';

import { useEffect, useMemo } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { PostProcessing } from 'three/webgpu';
import { pass, mix, uv, smoothstep, float } from 'three/tsl';

/**
 * AtmosphereFX — post-procesado TSL (WebGPU-native). SIN bloom (decisión de
 * Carlos): solo una viñeta sutil para enfocar la mirada. El "brillo" del sol lo
 * da su halo propio (SunMoon), no un bloom de pantalla. Toma el control del render
 * (useFrame priority 1), por eso debe ser el único que pinta el frame.
 */

export default function AtmosphereFX() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);

  const post = useMemo(() => {
    const pp = new PostProcessing(gl as unknown as ConstructorParameters<typeof PostProcessing>[0]);
    const scenePass = pass(scene, camera);
    const dist = uv().sub(0.5).length();
    const vignette = smoothstep(0.34, 0.92, dist).oneMinus();
    const amount = float(0.4);
    pp.outputNode = scenePass.mul(mix(float(1).sub(amount), float(1), vignette));
    return pp;
  }, [gl, scene, camera]);

  useFrame(() => {
    post.render();
  }, 1);

  useEffect(() => () => post.dispose(), [post]);

  return null;
}
