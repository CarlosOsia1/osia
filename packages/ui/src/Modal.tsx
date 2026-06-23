'use client';

import { useEffect, useId, useRef, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/**
 * Modal — diálogo accesible (S1.1-H3). Tonto: recibe `open`/`onClose`. Implementa el
 * estándar de la industria (no se reinventa): portal a <body>, role="dialog" + aria-modal,
 * cierre con Esc y clic en backdrop, foco atrapado dentro y foco devuelto al cerrar,
 * y respeto de prefers-reduced-motion (vía styles.css). Ver docs/02 §9.
 */
export type ModalProps = {
  open: boolean;
  onClose: () => void;
  /** Título mostrado y usado como aria-labelledby. */
  title?: string;
  /** id externo para aria-labelledby cuando no se usa `title`. */
  labelledBy?: string;
  children?: ReactNode;
  className?: string;
};

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

export function Modal({ open, onClose, title, labelledBy, children, className }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const prevFocus = useRef<HTMLElement | null>(null);
  const titleId = useId();

  // Al abrir: recuerda el foco previo y enfoca el diálogo. Al cerrar: lo devuelve.
  useEffect(() => {
    if (!open) return;
    prevFocus.current = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    return () => prevFocus.current?.focus?.();
  }, [open]);

  function onKeyDown(e: ReactKeyboardEvent<HTMLDivElement>): void {
    if (e.key === 'Escape') {
      e.stopPropagation(); // no dispares el handler global (p.ej. pointer-lock del mundo)
      onClose();
      return;
    }
    if (e.key !== 'Tab') return;
    const panel = panelRef.current;
    if (!panel) return;
    const items = panel.querySelectorAll<HTMLElement>(FOCUSABLE);
    const first = items[0];
    const last = items[items.length - 1];
    if (!first || !last) {
      e.preventDefault(); // sin focusables: el foco se queda en el panel
      return;
    }
    const active = document.activeElement;
    if (e.shiftKey && (active === first || active === panel)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  }

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="osia-modal__backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        className={['osia-modal', className].filter(Boolean).join(' ')}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : labelledBy}
        tabIndex={-1}
        onKeyDown={onKeyDown}
      >
        {title && (
          <h2 id={titleId} className="osia-modal__title">
            {title}
          </h2>
        )}
        {children}
      </div>
    </div>,
    document.body,
  );
}
