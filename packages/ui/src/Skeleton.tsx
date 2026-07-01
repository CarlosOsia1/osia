import type { CSSProperties } from 'react';

/**
 * Skeleton — marcador de carga con shimmer (índigo→champán). El estándar de lujo en OSIA: se prefiere
 * a los spinners para contenido. `aria-hidden` (es decorativo; el estado de carga se anuncia aparte).
 */
export type SkeletonProps = {
  variant?: 'text' | 'circle' | 'block';
  /** Ancho CSS (p.ej. '100%', '8rem', 120). */
  width?: string | number;
  /** Alto CSS. */
  height?: string | number;
  /** Nº de líneas para variant='text' (apiladas). */
  lines?: number;
  className?: string;
};

const dim = (v: string | number | undefined): string | undefined =>
  v === undefined ? undefined : typeof v === 'number' ? `${v}px` : v;

export function Skeleton({ variant = 'block', width, height, lines = 1, className }: SkeletonProps) {
  const base = `osia-skeleton osia-skeleton--${variant === 'block' ? 'block' : variant}`;
  const style: CSSProperties = { inlineSize: dim(width), blockSize: dim(height) };
  if (variant === 'text' && lines > 1) {
    return (
      <span aria-hidden="true" style={{ display: 'grid', gap: 'var(--space-2)' }}>
        {Array.from({ length: lines }, (_, i) => (
          <span
            key={i}
            className={[base, className].filter(Boolean).join(' ')}
            style={{ inlineSize: i === lines - 1 ? '70%' : dim(width) ?? '100%', blockSize: dim(height) }}
          />
        ))}
      </span>
    );
  }
  return <span aria-hidden="true" className={[base, className].filter(Boolean).join(' ')} style={style} />;
}
