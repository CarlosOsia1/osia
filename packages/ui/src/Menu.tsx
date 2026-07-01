'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * Menu — dropdown accesible (aria-haspopup + role=menu). Tonto: recibe el contenido del disparador
 * (`children`) y los `items`. Un item con `href` navega (link real, útil para saltar de app: Vestíbulo,
 * El Mundo); con `onClick` ejecuta (p.ej. cerrar sesión). Cierra con Esc, clic fuera y tras elegir.
 * El texto de cada item vive dentro de la clase tipografiada (osia-menu__item), única puerta de estilo.
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

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent): void {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent): void {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={['osia-menu', className].filter(Boolean).join(' ')}>
      <button
        type="button"
        className={triggerClassName}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((o) => !o)}
      >
        {children}
      </button>
      {open && (
        <div className="osia-menu__panel" role="menu">
          {items.map((it) => {
            const inner = (
              <>
                {it.icon}
                <span>{it.label}</span>
              </>
            );
            return (
              <div key={it.key} style={{ display: 'contents' }}>
                {it.separatorBefore && <span className="osia-menu__sep" aria-hidden="true" />}
                {it.href ? (
                  <a
                    role="menuitem"
                    className="osia-menu__item"
                    data-danger={it.danger || undefined}
                    href={it.href}
                    onClick={() => setOpen(false)}
                  >
                    {inner}
                  </a>
                ) : (
                  <button
                    type="button"
                    role="menuitem"
                    className="osia-menu__item"
                    data-danger={it.danger || undefined}
                    onClick={() => {
                      setOpen(false);
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
