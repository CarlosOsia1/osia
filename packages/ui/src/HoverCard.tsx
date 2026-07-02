'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * HoverCard — tarjeta de vistazo al pasar el puntero o enfocar (R2, El Salón: perfil rápido
 * sobre avatares y handles). Popover NO modal con intención medida: abre tras `openDelayMs`
 * (no salta al cruzar el puntero) y cierra tras `closeDelayMs` (da tiempo de entrar al card,
 * que puede tener acciones). `Escape` cierra. En táctil no interfiere: el tap sigue navegando
 * (el hover no existe) — el card es azúcar de escritorio, nunca la única vía a la información.
 */
export type HoverCardProps = {
  /** Disparador (avatar, handle…). Debe ser contenido enfocable o envolver un link. */
  children: ReactNode;
  /** Contenido del card (lo pinta la app; puede incluir acciones). */
  content: ReactNode;
  openDelayMs?: number;
  closeDelayMs?: number;
  className?: string;
};

export function HoverCard({
  children,
  content,
  openDelayMs = 350,
  closeDelayMs = 200,
  className,
}: HoverCardProps) {
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearTimer(): void {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }

  function scheduleOpen(): void {
    clearTimer();
    timer.current = setTimeout(() => setOpen(true), openDelayMs);
  }

  function scheduleClose(): void {
    clearTimer();
    timer.current = setTimeout(() => setOpen(false), closeDelayMs);
  }

  useEffect(() => clearTimer, []);

  return (
    <span
      className={['osia-hovercard', className].filter(Boolean).join(' ')}
      onMouseEnter={scheduleOpen}
      onMouseLeave={scheduleClose}
      onFocus={scheduleOpen}
      onBlur={scheduleClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && open) {
          e.stopPropagation();
          clearTimer();
          setOpen(false);
        }
      }}
    >
      {children}
      {open && <span className="osia-hovercard__panel">{content}</span>}
    </span>
  );
}
