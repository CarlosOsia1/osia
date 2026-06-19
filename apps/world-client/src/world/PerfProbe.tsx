'use client';

import { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { setPerf } from './perfStore';

/**
 * PerfProbe — muestrea el renderer DENTRO del Canvas (S0.2-H2).
 *
 * Corre a priority 2: DESPUÉS del render de AtmosphereFX (priority 1), así lee el
 * `info` ya acumulado del frame. Como AtmosphereFX hace varios render() internos
 * (scene pass + bloom), ponemos `info.autoReset = false` y reseteamos nosotros una
 * vez por frame, para que drawCalls/triangles reflejen el TOTAL del frame (incluido
 * el post-proceso). No provoca re-render de React: vuelca a perfStore throttleado.
 */

type RendererInfo = {
  autoReset?: boolean;
  reset?: () => void;
  render?: { calls?: number; drawCalls?: number; triangles?: number };
  memory?: { geometries?: number; textures?: number };
};

type RendererLike = {
  info?: RendererInfo;
  backend?: { isWebGPUBackend?: boolean; isWebGLBackend?: boolean };
  getPixelRatio?: () => number;
};

const SAMPLE_EVERY = 0.2; // segundos (≈5 Hz)

export default function PerfProbe() {
  const gl = useThree((s) => s.gl);
  const acc = useRef({ frames: 0, elapsed: 0, drawCalls: 0, triangles: 0, geometries: 0, textures: 0 });

  useEffect(() => {
    const r = gl as unknown as RendererLike;
    if (r.info) r.info.autoReset = false;
  }, [gl]);

  useFrame((_, delta) => {
    const r = gl as unknown as RendererLike;
    const a = acc.current;
    a.frames += 1;
    a.elapsed += delta;

    const info = r.info;
    if (info) {
      a.drawCalls = info.render?.drawCalls ?? info.render?.calls ?? 0;
      a.triangles = info.render?.triangles ?? 0;
      a.geometries = info.memory?.geometries ?? 0;
      a.textures = info.memory?.textures ?? 0;
      info.reset?.();
    }

    if (a.elapsed >= SAMPLE_EVERY) {
      const backend = r.backend?.isWebGPUBackend
        ? 'WebGPU'
        : r.backend?.isWebGLBackend
          ? 'WebGL2'
          : 'WebGL';
      setPerf({
        fps: a.frames / a.elapsed,
        drawCalls: a.drawCalls,
        triangles: a.triangles,
        geometries: a.geometries,
        textures: a.textures,
        pixelRatio: r.getPixelRatio?.() ?? 1,
        backend,
      });
      a.frames = 0;
      a.elapsed = 0;
    }
  }, 2);

  return null;
}
