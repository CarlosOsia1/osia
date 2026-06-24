import type { CSSProperties, ReactNode } from 'react';

/** Mensaje de error de formulario (role="alert" + danger token). Reutilizable (no duplicar el <p>). */
export function FormError({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <p role="alert" className={['osia-form-error', className].filter(Boolean).join(' ')} style={style}>
      {children}
    </p>
  );
}
