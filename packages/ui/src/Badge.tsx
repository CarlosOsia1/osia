/**
 * Badge — conteo pequeño (no-leídas) o punto. Devuelve null cuando no hay nada que mostrar
 * (count ≤ 0 y no es dot), para que el llamador no tenga que condicionar.
 */
export type BadgeProps = {
  count?: number;
  /** Punto sin número (p.ej. "hay algo nuevo"). */
  dot?: boolean;
  /** Tope visual: por encima muestra `{max}+`. */
  max?: number;
  /** Etiqueta accesible (p.ej. "3 sin leer"). */
  label?: string;
  className?: string;
};

export function Badge({ count, dot = false, max = 99, label, className }: BadgeProps) {
  if (dot) {
    return <span className={['osia-badge', 'osia-badge--dot', className].filter(Boolean).join(' ')} aria-label={label} />;
  }
  if (count === undefined || count <= 0) return null;
  const shown = count > max ? `${max}+` : String(count);
  return (
    <span className={['osia-badge', className].filter(Boolean).join(' ')} aria-label={label}>
      {shown}
    </span>
  );
}
