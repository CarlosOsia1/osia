'use client';

import { useState, type InputHTMLAttributes, type Ref } from 'react';
import { Field } from './Field';

export type PasswordFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  /** Etiqueta del botón cuando la contraseña está oculta (i18n desde la app, §3.2). */
  showLabel: string;
  /** Etiqueta del botón cuando está visible. */
  hideLabel: string;
  inputRef?: Ref<HTMLInputElement>;
  invalid?: boolean;
};

/** Field de contraseña con botón Ver/Ocultar autocontenido (S1.4/S1.6). Reutilizable. */
export function PasswordField({ showLabel, hideLabel, inputRef, invalid, ...rest }: PasswordFieldProps) {
  const [show, setShow] = useState(false);
  return (
    <div className="osia-password">
      <Field inputRef={inputRef} invalid={invalid} type={show ? 'text' : 'password'} {...rest} />
      <button
        type="button"
        className="osia-btn osia-btn--ghost osia-btn--sm osia-password__toggle"
        onClick={() => setShow((s) => !s)}
      >
        {show ? hideLabel : showLabel}
      </button>
    </div>
  );
}
