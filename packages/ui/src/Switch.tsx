'use client';

import { useId, type ReactNode } from 'react';

export type SwitchProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
  disabled?: boolean;
};

/** Interruptor accesible (role="switch", §9): teclado, foco visible y label asociado. Reutilizable. */
export function Switch({ checked, onChange, label, disabled }: SwitchProps) {
  const labelId = useId();
  return (
    <div className="osia-switch">
      <span id={labelId} className="osia-switch__label">
        {label}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={labelId}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className="osia-switch__track"
        data-checked={checked || undefined}
      >
        <span className="osia-switch__thumb" aria-hidden />
      </button>
    </div>
  );
}
