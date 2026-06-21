import type { CSSProperties } from 'react';

/** Dot — punto de presencia/estado. `glow` añade un halo del mismo color. */
export function Dot({
  color,
  glow = false,
  style,
}: {
  color: string;
  glow?: boolean;
  style?: CSSProperties;
}) {
  return (
    <span
      className="osia-dot"
      style={{ background: color, ...(glow ? { boxShadow: `0 0 8px ${color}` } : {}), ...style }}
    />
  );
}
