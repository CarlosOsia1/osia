'use client';

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';

/**
 * Menu — dropdown accesible (patrón WAI-ARIA APG "menu button", completo desde R1 de la
 * reconstrucción: antes prometía `role=menu` sin teclado y era inoperable sin ratón).
 *
 * Teclado: en el disparador, `ArrowDown`/`Enter`/`Space` abren y enfocan el primer item y
 * `ArrowUp` abre y enfoca el último; dentro del panel, `ArrowUp`/`ArrowDown` navegan con
 * envolvente, `Home`/`End` saltan a los extremos, `Escape` cierra y devuelve el foco al
 * disparador, y `Tab` cierra dejando seguir el flujo normal. Los items van con `tabindex=-1`
 * (foco programático, roving). Cierra también con clic fuera y tras elegir.
 *
 * Tonto: recibe el contenido del disparador (`children`) y los `items`. Un item con `href`
 * navega (link real, útil para saltar de app: Vestíbulo, El Mundo); con `onClick` ejecuta
 * (p.ej. cerrar sesión). El texto de cada item vive dentro de la clase tipografiada
 * (osia-menu__item), única puerta de estilo.
 */
export type MenuItem = {
  key: string;
  label: string;
  icon?: ReactNode;
  href?: string;
  onClick?: () => void;
  danger?: boolean;
  /** Separador (hairline) antes de este item. */
  separatorBefore?: boolean;
};

export type MenuProps = {
  /** Contenido del disparador (avatar + nombre + chevron, o un icono). */
  children: ReactNode;
  items: MenuItem[];
  /** Nombre accesible del disparador. */
  label: string;
  className?: string;
  /** Clase del disparador (default: píldora `osia-menu__trigger`; usa `osia-iconbtn` para solo-icono). */
  triggerClassName?: string;
};

export function Menu({ children, items, label, className, triggerClassName = 'osia-menu__trigger' }: MenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);
  /** A qué item mover el foco cuando el panel termine de montarse. */
  const pendingFocus = useRef<'first' | 'last' | null>(null);

  function focusables(): HTMLElement[] {
    return itemRefs.current.filter((el): el is HTMLElement => el !== null);
  }

  function focusAt(index: number): void {
    const els = focusables();
    if (els.length === 0) return;
    const wrapped = ((index % els.length) + els.length) % els.length;
    els[wrapped]?.focus();
  }

  function openWithFocus(target: 'first' | 'last'): void {
    pendingFocus.current = target;
    setOpen(true);
  }

  function close(returnFocus: boolean): void {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }

  useEffect(() => {
    if (!open || pendingFocus.current === null) return;
    const els = itemRefs.current.filter((el): el is HTMLElement => el !== null);
    const target = pendingFocus.current === 'first' ? els[0] : els[els.length - 1];
    target?.focus();
    pendingFocus.current = null;
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent): void {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  function onTriggerKeyDown(e: ReactKeyboardEvent): void {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (open) close(true);
      else openWithFocus('first');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      openWithFocus('last');
    }
  }

  function onPanelKeyDown(e: ReactKeyboardEvent): void {
    if (e.key === 'Escape') {
      e.preventDefault();
      close(true);
      return;
    }
    if (e.key === 'Tab') {
      // El menú no atrapa Tab (APG): se cierra y el foco sigue su flujo natural.
      setOpen(false);
      return;
    }
    const keys = ['ArrowDown', 'ArrowUp', 'Home', 'End'];
    if (!keys.includes(e.key)) return;
    e.preventDefault();
    const els = focusables();
    const current = els.findIndex((el) => el === document.activeElement);
    if (e.key === 'ArrowDown') focusAt(current + 1);
    else if (e.key === 'ArrowUp') focusAt(current - 1);
    else if (e.key === 'Home') focusAt(0);
    else focusAt(-1);
  }

  itemRefs.current.length = items.length;

  return (
    <div ref={rootRef} className={['osia-menu', className].filter(Boolean).join(' ')}>
      <button
        ref={triggerRef}
        type="button"
        className={triggerClassName}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onClick={() => (open ? close(false) : openWithFocus('first'))}
        onKeyDown={onTriggerKeyDown}
      >
        {children}
      </button>
      {open && (
        <div className="osia-menu__panel" role="menu" aria-label={label} onKeyDown={onPanelKeyDown}>
          {items.map((it, index) => {
            const inner = (
              <>
                {it.icon}
                <span>{it.label}</span>
              </>
            );
            const ref = (el: HTMLElement | null): void => {
              itemRefs.current[index] = el;
            };
            return (
              <div key={it.key} style={{ display: 'contents' }}>
                {it.separatorBefore && <span className="osia-menu__sep" aria-hidden="true" />}
                {it.href ? (
                  <a
                    ref={ref}
                    role="menuitem"
                    tabIndex={-1}
                    className="osia-menu__item"
                    data-danger={it.danger || undefined}
                    href={it.href}
                    onClick={() => close(false)}
                  >
                    {inner}
                  </a>
                ) : (
                  <button
                    ref={ref}
                    type="button"
                    role="menuitem"
                    tabIndex={-1}
                    className="osia-menu__item"
                    data-danger={it.danger || undefined}
                    onClick={() => {
                      close(true);
                      it.onClick?.();
                    }}
                  >
                    {inner}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
