/** Utilidades matemáticas puras del motor de atmósfera. */

export const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);

export const lerp = (a: number, b: number, k: number): number => a + (b - a) * k;

/** smoothstep en [0,1] (ease in-out) para transiciones sin "interruptor". */
export const smoothstep = (k: number): number => {
  const x = clamp01(k);
  return x * x * (3 - 2 * x);
};

/** PRNG sembrado determinista (mulberry32). Prohibido Math.random en el motor. */
export function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
