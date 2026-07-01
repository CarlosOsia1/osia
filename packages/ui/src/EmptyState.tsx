import type { ReactNode } from 'react';
import { Text } from './Text';

/**
 * EmptyState — vacío editorial con motivo de constelación (coherente con El Mundo). Comunica calma y
 * exclusividad, no "error". Recibe título/descripción (ya traducidos) + una acción opcional.
 */
export type EmptyStateProps = {
  /** Icono grande opcional sobre el título. */
  icon?: ReactNode;
  title: string;
  description?: string;
  /** CTA opcional (p.ej. <Button/>). */
  action?: ReactNode;
  className?: string;
};

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={['osia-emptystate', className].filter(Boolean).join(' ')}>
      <span className="osia-emptystate__stars" aria-hidden="true" />
      <div className="osia-emptystate__body">
        {icon}
        <Text variant="subheading" tone="accent">
          {title}
        </Text>
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
