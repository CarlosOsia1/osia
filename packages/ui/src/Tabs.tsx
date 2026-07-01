/**
 * Tabs — pestañas accesibles (role=tablist). Tonto y controlado: recibe `tabs`, `activeKey`,
 * `onChange`. Un `count` opcional por pestaña (p.ej. Solicitudes · 3). Los paneles los pinta la app.
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
  className?: string;
};

export function Tabs({ tabs, activeKey, onChange, label, className }: TabsProps) {
  return (
    <div className={['osia-tabs', className].filter(Boolean).join(' ')} role="tablist" aria-label={label}>
      {tabs.map((t) => {
        const active = t.key === activeKey;
        return (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={active}
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
