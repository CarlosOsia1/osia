'use client';

import { useEffect, useRef } from 'react';
import { useReducedMotion } from '../ThemeProvider';

export type ThresholdTransitionProps = {
  active: boolean;
  /** Wordmark de marca que aparece durante el cruce (la app pasa OSIA.name). */
  brand?: string;
  /** Texto de estado durante el cruce (p. ej. "Cruzando el umbral…"). */
  label?: string;
  /** Se invoca cuando la coreografia termina (momento de navegar). */
  onComplete?: () => void;
};

/** Coreografia con motion pleno; con `reduce` degrada a un fade corto (docs/02 §7.3 / §9). */
const CINEMATIC_MS = 720;
const REDUCED_MS = 220;

/**
 * ThresholdTransition (S1.7-H3) — el acto mas importante del sistema: el scrim onix sube, aparece
 * la marca OSIA con una barra champan y, al terminar, dispara `onComplete` (navegar a El Mundo).
 * Respeta prefers-reduced-motion. Convierte la navegacion entre apps en ritual, no en una pestana.
 */
export function ThresholdTransition({ active, brand, label, onComplete }: ThresholdTransitionProps) {
  const reduced = useReducedMotion();
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (!active) return;
    const ms = reduced ? REDUCED_MS : CINEMATIC_MS;
    const id = window.setTimeout(() => onCompleteRef.current?.(), ms);
    return () => window.clearTimeout(id);
  }, [active, reduced]);

  if (!active) return null;
  return (
    <div
      className="osia-threshold-transition"
      data-reduced={reduced || undefined}
      role="status"
      aria-live="polite"
    >
      {brand ? <span className="osia-threshold-transition__mark">{brand}</span> : null}
      {label ? <span className="osia-threshold-transition__label">{label}</span> : null}
      <span className="osia-threshold-transition__bar" aria-hidden>
        <span />
      </span>
    </div>
  );
}
