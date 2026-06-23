import type { InputHTMLAttributes, Ref } from 'react';

/** Field — input de texto con la estética OSIA (foco = "luz que se enciende", no borde azul). */
export type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  inputRef?: Ref<HTMLInputElement>;
  /** Estado de error: borde danger + aria-invalid (accesible, no solo por color — §9). */
  invalid?: boolean;
  /** id del texto de error asociado (→ aria-describedby). */
  describedById?: string;
};

export function Field({ className, inputRef, invalid, describedById, ...rest }: FieldProps) {
  const cls = ['osia-field', invalid ? 'osia-field--invalid' : '', className].filter(Boolean).join(' ');
  return (
    <input
      ref={inputRef}
      className={cls}
      aria-invalid={invalid || undefined}
      aria-describedby={describedById}
      {...rest}
    />
  );
}
