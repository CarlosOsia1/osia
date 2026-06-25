import type { HTMLAttributes } from 'react';

export type HudPanelProps = HTMLAttributes<HTMLDivElement> & {
  /** Tiene controles (botones/input) → pointer-events: auto. Por defecto solo muestra (none). */
  interactive?: boolean;
};

/**
 * HudPanel — contenedor de overlay del HUD (sobre el Canvas 3D, fuera del ciclo de React-3D).
 * Encapsula el boilerplate común (absolute · z-index · user-select · fuente · pointer-events) que
 * antes cada panel repetía inline (§2.4). La POSICIÓN fina (esquina/offset) va por `style` desde la
 * app: cada panel tiene su anclaje intencional y NO son uniformes a propósito. Tonto y reutilizable.
 */
export function HudPanel({ interactive = false, className, ...rest }: HudPanelProps) {
  const cls = ['osia-hud', interactive ? 'osia-hud--interactive' : '', className]
    .filter(Boolean)
    .join(' ');
  return <div className={cls} {...rest} />;
}
