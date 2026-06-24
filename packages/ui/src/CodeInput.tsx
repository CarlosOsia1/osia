'use client';

import { useRef, type ClipboardEvent, type KeyboardEvent } from 'react';

export type CodeInputProps = {
  /** Cantidad de celdas (default 6). */
  length?: number;
  /** Valor actual (string de dígitos, ≤ length). */
  value: string;
  onChange: (value: string) => void;
  /** Se dispara cuando se completan todas las celdas. */
  onComplete?: (value: string) => void;
  invalid?: boolean;
  /** Etiqueta accesible del grupo (i18n desde la app, §3.2). */
  ariaLabel: string;
};

/**
 * CodeInput — entrada de código de N celdas (S1.5-H1): OTP de verificación. Accesible (un input
 * por celda, navegación por teclado, pegado), tonto (recibe value/onChange). Solo dígitos.
 */
export function CodeInput({
  length = 6,
  value,
  onChange,
  onComplete,
  invalid = false,
  ariaLabel,
}: CodeInputProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  function commit(next: string): void {
    const digits = next.replace(/\D/g, '').slice(0, length);
    onChange(digits);
    if (digits.length === length) onComplete?.(digits);
    return;
  }

  function onCellChange(index: number, raw: string): void {
    const digit = raw.replace(/\D/g, '').slice(-1);
    if (!digit) return;
    const next = (value.slice(0, index) + digit + value.slice(index + 1)).slice(0, length);
    commit(next);
    refs.current[Math.min(index + 1, length - 1)]?.focus();
  }

  function onKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>): void {
    if (e.key === 'Backspace' && !value[index] && index > 0) {
      e.preventDefault();
      commit(value.slice(0, index - 1));
      refs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      refs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      refs.current[index + 1]?.focus();
    }
  }

  function onPaste(e: ClipboardEvent<HTMLInputElement>): void {
    e.preventDefault();
    commit(e.clipboardData.getData('text'));
    refs.current[Math.min(value.length, length - 1)]?.focus();
  }

  return (
    <div className="osia-code" role="group" aria-label={ariaLabel}>
      {Array.from({ length }, (_, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          className={['osia-code__cell', invalid ? 'osia-code__cell--invalid' : '']
            .filter(Boolean)
            .join(' ')}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          aria-label={`${ariaLabel} ${i + 1}`}
          aria-invalid={invalid || undefined}
          value={value[i] ?? ''}
          onChange={(e) => onCellChange(i, e.currentTarget.value)}
          onKeyDown={(e) => onKeyDown(i, e)}
          onPaste={onPaste}
        />
      ))}
    </div>
  );
}
