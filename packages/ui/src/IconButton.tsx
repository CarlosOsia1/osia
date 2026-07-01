import type { ButtonHTMLAttributes, ReactNode } from 'react';

/**
 * IconButton — botón circular de solo icono (header, acciones de post). Exige `label` (aria-label):
 * un botón sin texto DEBE tener nombre accesible. Puede llevar un `badge` (conteo) en la esquina.
 */
export type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> & {
  /** Nombre accesible obligatorio. */
  label: string;
  /** Icono (de `@osia/ui` icons). */
  children: ReactNode;
  /** Adorno de esquina (p.ej. <Badge/>). */
  badge?: ReactNode;
};

export function IconButton({ label, children, badge, className, type, ...rest }: IconButtonProps) {
  return (
    <button
      type={type ?? 'button'}
      className={['osia-iconbtn', className].filter(Boolean).join(' ')}
      aria-label={label}
      {...rest}
    >
      {children}
      {badge && <span className="osia-iconbtn__badge">{badge}</span>}
    </button>
  );
}
