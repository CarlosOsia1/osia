import type { ReactNode } from 'react';
import { Text } from './Text';

/**
 * ErrorState — fallo de carga con salida (R1 de la reconstrucción: antes un API caído se
 * pintaba como feed «vacío», mintiendo). Hermano de `EmptyState` pero con semántica de error:
 * `role="alert"` (se anuncia al aparecer) y un CTA de reintento que pasa la app.
 *
 * Sobrio, no alarmista: en una casa de lujo un tropiezo se comunica con calma. Recibe
 * título/descripción YA traducidos (§2.3) + la acción (p.ej. `<Button onClick={refetch}>`).
 */
export type ErrorStateProps = {
  /** Icono grande opcional sobre el título. */
  icon?: ReactNode;
  title: string;
  description?: string;
  /** CTA de reintento u otra salida (p.ej. <Button/>). */
  action?: ReactNode;
  className?: string;
};

export function ErrorState({ icon, title, description, action, className }: ErrorStateProps) {
  return (
    <div role="alert" className={['osia-errorstate', className].filter(Boolean).join(' ')}>
      <div className="osia-errorstate__body">
        {icon}
        <Text variant="subheading">{title}</Text>
        {description && (
          <Text variant="read" tone="muted">
            {description}
          </Text>
        )}
        {action}
      </div>
    </div>
  );
}
