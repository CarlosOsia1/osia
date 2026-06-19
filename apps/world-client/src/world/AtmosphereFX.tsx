'use client';

import { useEffect, useMemo } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { PostProcessing } from 'three/webgpu';
import { pass, mix, uv, smoothstep, float } from 'three/tsl';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';

/**
 * AtmosphereFX — post-procesado TSL de EL MUNDO (S0.2 · WebGPU-native).
 *
 * Look "hecho a mano" inspirado en el cozy-web (Messenger de Abeto): bloom suave
 * sobre los acentos champán + viñeta para enfocar la mirada. Escrito en TSL: el
 * MISMO grafo de nodos compila a WGSL (WebGPU) y a GLSL (fallback WebGL2). El
 * Motor de Atmósfera server-authoritative (S0.7) modulará estos parámetros con la
 * hora/clima; por ahora son constantes afinables a ojo.
 *
 * Toma el control del render (useFrame con priority > 0 desactiva el render
 * automático de R3F), por eso debe ser el único que pinta el frame.
 */
export default function AtmosphereFX() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);

  const post = useMemo(() => {
    // gl es un WebGPURenderer en runtime (R3F lo tipa como WebGLRenderer).
    const pp = new PostProcessing(gl as unknown as ConstructorParameters<typeof PostProcessing>[0]);

    const scenePass = pass(scene, camera);
    // Bloom: strength, radius, threshold alto → solo florecen los píxeles brillantes.
    const bloomPass = bloom(scenePass, 0.7, 0.3, 0.6);

    // Viñeta TSL: factor 1 en el centro → oscurece bordes. Un único punto de tone-grade.
    const dist = uv().sub(0.5).length();
    const vignette = smoothstep(0.32, 0.85, dist).oneMinus();
    const amount = float(0.55);

    pp.outputNode = scenePass.add(bloomPass).mul(mix(float(1).sub(amount), float(1), vignette));
    return pp;
  }, [gl, scene, camera]);

  useFrame(() => {
    post.render();
  }, 1);

  useEffect(() => () => post.dispose(), [post]);

  return null;
}
