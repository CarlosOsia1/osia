import type { HTMLAttributes } from 'react';
import { Text } from './Text';

/** Tope VISUAL de la barra (la popularidad no está acotada; el número real manda). */
const SOFT_CAP = 100;

export type PopularityMeterProps = HTMLAttributes<HTMLDivElement> & {
  /** Puntos de popularidad (derivados del ledger; pueden exceder el tope visual). */
  points: number;
  /** Etiqueta ya traducida por la app (i18n). */
  label: string;
};

/**
 * PopularityMeter (S3.5-H1) — estatus mineral, NO semáforo: una barra champán sutil + el número, sin
 * rojo/verde de vanidad. El número es la verdad (accesible vía `Text`); la barra es decorativa
 * (`aria-hidden`) y se llena relativa a un tope visual. Consume tokens; cambio de look = un solo lugar.
 */
export function PopularityMeter({ points, label, className, style, ...rest }: PopularityMeterProps) {
  const pct = Math.max(0, Math.min(1, points / SOFT_CAP)) * 100;
  return (
    <div
      className={['osia-popularity', className].filter(Boolean).join(' ')}
      style={{ display: 'grid', gap: 'var(--space-1, 4px)', ...style }}
      {...rest}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-2, 8px)' }}>
        <Text variant="overline" tone="subtle">
          {label}
        </Text>
        <Text variant="value">{points}</Text>
      </div>
      <div
        aria-hidden="true"
        style={{
          height: 4,
          borderRadius: 999,
          background: 'var(--color-border, #2a2a2a)',
          overflow: 'hidden',
        }}
      >
        <div style={{ width: `${pct}%`, height: '100%', background: 'var(--color-accent, #cbb89a)' }} />
      </div>
    </div>
  );
}
