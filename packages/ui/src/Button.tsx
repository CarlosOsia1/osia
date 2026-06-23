import type { ButtonHTMLAttributes } from 'react';

/**
 * Button — el ÚNICO botón de OSIA. Variante `primary` es el único CTA (uno por vista).
 * Consume tokens de styles.css; jamás se redefine su estilo inline en las apps.
 */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Marca el botón como "encendido" (p.ej. modo activo). */
  active?: boolean;
  /** En proceso: deshabilita, marca aria-busy y muestra un spinner. */
  loading?: boolean;
};

const VARIANT: Record<ButtonVariant, string> = {
  primary: 'osia-btn--primary',
  secondary: '',
  ghost: 'osia-btn--ghost',
  danger: 'osia-btn--danger',
};
const SIZE: Record<ButtonSize, string> = { sm: 'osia-btn--sm', md: '', lg: 'osia-btn--lg' };

export function Button({
  variant = 'secondary',
  size = 'md',
  active = false,
  loading = false,
  className,
  type,
  disabled,
  children,
  ...rest
}: ButtonProps) {
  const cls = [
    'osia-btn',
    VARIANT[variant],
    SIZE[size],
    active ? 'osia-btn--active' : '',
    loading ? 'osia-btn--loading' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <button
      type={type ?? 'button'}
      className={cls}
      disabled={disabled ?? loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <span className="osia-btn__spinner" aria-hidden="true" />}
      {children}
    </button>
  );
}
