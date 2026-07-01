/** Utilidades matemáticas puras del motor de atmósfera. */
export declare const clamp01: (x: number) => number;
export declare const lerp: (a: number, b: number, k: number) => number;
/** smoothstep en [0,1] (ease in-out) para transiciones sin "interruptor". */
export declare const smoothstep: (k: number) => number;
/** PRNG sembrado determinista (mulberry32). Prohibido Math.random en el motor. */
export declare function mulberry32(seed: number): () => number;
//# sourceMappingURL=math.d.ts.map