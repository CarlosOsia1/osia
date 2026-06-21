import type { InputHTMLAttributes, Ref } from 'react';

/** Field — input de texto con la estética OSIA (foco = "luz que se enciende", no borde azul). */
export type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  inputRef?: Ref<HTMLInputElement>;
};

export function Field({ className, inputRef, ...rest }: FieldProps) {
  const cls = ['osia-field', className].filter(Boolean).join(' ');
  return <input ref={inputRef} className={cls} {...rest} />;
}
