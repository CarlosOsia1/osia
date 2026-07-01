import { createElement, type ElementType, type ReactNode } from 'react';
import { Badge } from './Badge';

/**
 * AppShell — el MARCO de lujo de una app-documento de OSIA (La Red Social): header frosted fijo +
 * sidebar de navegación + rail derecho + tab bar en móvil, a TODO EL ANCHO (no columna central).
 * Responsive: 3 columnas ≥1200px, 2 columnas ≥880px (rail plegado), 1 columna + tab bar <880px.
 *
 * Tonto y reutilizable (§2.1/§2.2): renderiza el cromo y la navegación desde `nav` (datos), y deja
 * SLOTS para lo que necesita sesión (búsqueda, campana, menú de perfil, rail). La app pasa su `Link`
 * (Next) por `LinkComponent` para navegación cliente con `href` real (a11y + middle-click).
 */
export type ShellNavItem = {
  key: string;
  href: string;
  label: string;
  icon: ReactNode;
  /** Conteo (p.ej. no-leídas) mostrado como Badge. */
  badge?: number;
};

export type AppShellProps = {
  /** `logoSrc` = imagen del logo de marca (recomendado); si falta, se usa `label` como wordmark. */
  brand: { href: string; label: string; logoSrc?: string };
  nav: ShellNavItem[];
  /** Items de la tab bar móvil (por defecto = `nav`). */
  mobileNav?: ShellNavItem[];
  activeKey: string;
  /** Centro del header: buscador de personas (necesita datos → slot de la app). */
  searchSlot?: ReactNode;
  /** Derecha del header: campana + menú de perfil (necesitan sesión → slot de la app). */
  headerActions?: ReactNode;
  /** Columna derecha: "en línea" + "a quién seguir" (slot de la app). */
  rail?: ReactNode;
  children: ReactNode;
  LinkComponent?: ElementType;
};

function NavItem({
  item,
  active,
  Link,
}: {
  item: ShellNavItem;
  active: boolean;
  Link: ElementType;
}) {
  return createElement(
    Link,
    { href: item.href, className: 'osia-navitem', 'data-active': active || undefined },
    <>
      <span className="osia-navitem__icon">{item.icon}</span>
      <span>{item.label}</span>
      {item.badge !== undefined && item.badge > 0 && (
        <span className="osia-navitem__badge">
          <Badge count={item.badge} />
        </span>
      )}
    </>,
  );
}

function TabBarItem({
  item,
  active,
  Link,
}: {
  item: ShellNavItem;
  active: boolean;
  Link: ElementType;
}) {
  return createElement(
    Link,
    { href: item.href, className: 'osia-tabbar__item', 'data-active': active || undefined, 'aria-label': item.label },
    <>
      {item.icon}
      {item.badge !== undefined && item.badge > 0 && (
        <span style={{ position: 'absolute', transform: 'translate(0.7rem, -0.7rem)' }}>
          <Badge dot label={item.label} />
        </span>
      )}
    </>,
  );
}

export function AppShell({
  brand,
  nav,
  mobileNav,
  activeKey,
  searchSlot,
  headerActions,
  rail,
  children,
  LinkComponent = 'a',
}: AppShellProps) {
  const Link = LinkComponent;
  const tabs = mobileNav ?? nav;
  return (
    <div className="osia-shell">
      <header className="osia-appheader">
        {createElement(
          Link,
          { href: brand.href, className: 'osia-appheader__brand', 'aria-label': brand.label },
          brand.logoSrc ? (
            <img className="osia-appheader__logo" src={brand.logoSrc} alt={brand.label} />
          ) : (
            <span className="osia-appheader__wordmark">{brand.label}</span>
          ),
        )}
        {searchSlot && <div className="osia-appheader__search">{searchSlot}</div>}
        <div className="osia-appheader__actions">{headerActions}</div>
      </header>

      <div className="osia-shell__body" data-rail={rail ? true : undefined}>
        <aside className="osia-shell__sidebar">
          <nav className="osia-sidebar" aria-label={brand.label}>
            {nav.map((item) => (
              <NavItem key={item.key} item={item} active={item.key === activeKey} Link={Link} />
            ))}
          </nav>
        </aside>

        <main className="osia-shell__main">{children}</main>

        {rail && <aside className="osia-shell__rail">{rail}</aside>}
      </div>

      <nav className="osia-tabbar" aria-label={brand.label}>
        {tabs.map((item) => (
          <TabBarItem key={item.key} item={item} active={item.key === activeKey} Link={Link} />
        ))}
      </nav>
    </div>
  );
}
