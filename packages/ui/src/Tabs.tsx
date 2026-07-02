'use client';

import { useRef, type KeyboardEvent as ReactKeyboardEvent } from 'react';

/**
 * Tabs — pestañas accesibles (patrón WAI-ARIA APG "tabs", completo desde R1 de la
 * reconstrucción: antes prometía `role=tab` sin teclado y era inoperable sin ratón).
 *
 * Teclado (roving tabindex): solo la pestaña activa es tabulable; `ArrowRight`/`ArrowLeft`
 * mueven la selección con envolvente, `Home`/`End` saltan a los extremos. La selección sigue
 * al foco (los paneles ya están cargados en cliente, APG lo recomienda para ese caso).
 *
 * Tonto y controlado: recibe `tabs`, `activeKey`, `onChange`. Un `count` opcional por pestaña
 * (p.ej. Solicitudes · 3). Los paneles los pinta la app; si pasa `idBase`, cada pestaña emite
 * `id="{idBase}-tab-{key}"` y `aria-controls="{idBase}-panel-{key}"` — el panel de la app debe
 * llevar `id="{idBase}-panel-{key}"` y `aria-labelledby="{idBase}-tab-{key}"`.
 */
export type TabItem = {
  key: string;
  label: string;
  count?: number;
};

export type TabsProps = {
  tabs: TabItem[];
  activeKey: string;
  onChange: (key: string) => void;
  /** Nombre accesible del grupo de pestañas. */
  label: string;
  /** Prefijo de ids para cablear `aria-controls` con los paneles de la app (opcional). */
  idBase?: string;
  className?: string;
};

export function Tabs({ tabs, activeKey, onChange, label, idBase, className }: TabsProps) {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  tabRefs.current.length = tabs.length;

  function selectAt(index: number): void {
    if (tabs.length === 0) return;
    const wrapped = ((index % tabs.length) + tabs.length) % tabs.length;
    const tab = tabs[wrapped];
    if (!tab) return;
    onChange(tab.key);
    tabRefs.current[wrapped]?.focus();
  }

  function onKeyDown(e: ReactKeyboardEvent): void {
    const keys = ['ArrowRight', 'ArrowLeft', 'Home', 'End'];
    if (!keys.includes(e.key)) return;
    e.preventDefault();
    const current = tabs.findIndex((t) => t.key === activeKey);
    if (e.key === 'ArrowRight') selectAt(current + 1);
    else if (e.key === 'ArrowLeft') selectAt(current - 1);
    else if (e.key === 'Home') selectAt(0);
    else selectAt(tabs.length - 1);
  }

  return (
    <div
      className={['osia-tabs', className].filter(Boolean).join(' ')}
      role="tablist"
      aria-label={label}
      onKeyDown={onKeyDown}
    >
      {tabs.map((t, index) => {
        const active = t.key === activeKey;
        return (
          <button
            key={t.key}
            ref={(el) => {
              tabRefs.current[index] = el;
            }}
            type="button"
            role="tab"
            id={idBase ? `${idBase}-tab-${t.key}` : undefined}
            aria-controls={idBase ? `${idBase}-panel-${t.key}` : undefined}
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            data-active={active || undefined}
            className="osia-tabs__tab"
            onClick={() => onChange(t.key)}
          >
            {t.label}
            {t.count !== undefined && t.count > 0 && <span className="osia-tabs__count">{t.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
