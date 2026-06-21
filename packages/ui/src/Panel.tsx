import type { HTMLAttributes } from 'react';

/** Panel — superficie HUD translúcida (ónix + blur). `solid` para inputs/diálogos. */
export type PanelProps = HTMLAttributes<HTMLDivElement> & { solid?: boolean };

export function Panel({ solid = false, className, ...rest }: PanelProps) {
  const cls = ['osia-panel', solid ? 'osia-panel--solid' : '', className].filter(Boolean).join(' ');
  return <div className={cls} {...rest} />;
}
