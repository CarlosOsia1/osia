import type { HTMLAttributes } from 'react';

/**
 * Card — superficie de CONTENIDO (más opaca que Panel, pensada para leer). Tonta:
 * recibe children y estilo por tokens. `pad` añade padding interno; `interactive`
 * la vuelve clickable (hover de borde/elevación).
 */
export type CardProps = HTMLAttributes<HTMLDivElement> & {
  pad?: boolean;
  interactive?: boolean;
};

export function Card({ pad = false, interactive = false, className, ...rest }: CardProps) {
  const cls = [
    'osia-card',
    pad ? 'osia-card--pad' : '',
    interactive ? 'osia-card--interactive' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  return <div className={cls} {...rest} />;
}
