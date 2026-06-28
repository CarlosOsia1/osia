import type { TextareaHTMLAttributes, Ref } from 'react';

/** Textarea con la estética OSIA (misma piel que Field: foco = "luz que se enciende"). Multi-línea. */
export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  textareaRef?: Ref<HTMLTextAreaElement>;
  /** Estado de error: borde danger + aria-invalid (accesible, no solo por color — §9). */
  invalid?: boolean;
  /** id del texto de error asociado (→ aria-describedby). */
  describedById?: string;
};

export function Textarea({ className, textareaRef, invalid, describedById, ...rest }: TextareaProps) {
  const cls = ['osia-field', invalid ? 'osia-field--invalid' : '', className].filter(Boolean).join(' ');
  return (
    <textarea
      ref={textareaRef}
      className={cls}
      aria-invalid={invalid || undefined}
      aria-describedby={describedById}
      {...rest}
    />
  );
}
