'use client';

import type { ChangeEvent, ReactNode } from 'react';
import { Text } from './Text';
import { Skeleton } from './Skeleton';

/**
 * ImageUploadField — campo de subida de imagen (foto/portada de perfil, S3.8). Tonto: muestra la
 * previsualización (o icono + hint), y al elegir un archivo llama `onFile`. La subida real (PUT
 * prefirmado) y el estado la maneja la app. `round` para foto de perfil circular. Accesible: el
 * `<label>` envuelve el input, así el clic/teclado enfoca y abre el selector.
 */
export type ImageUploadFieldProps = {
  label: string;
  previewUrl?: string | null;
  onFile: (file: File) => void;
  accept?: string;
  round?: boolean;
  uploading?: boolean;
  hint?: string;
  icon?: ReactNode;
};

export function ImageUploadField({
  label,
  previewUrl,
  onFile,
  accept = 'image/png,image/jpeg,image/webp',
  round = false,
  uploading = false,
  hint,
  icon,
}: ImageUploadFieldProps) {
  function onChange(e: ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0];
    if (file) onFile(file);
    e.target.value = ''; // permite re-elegir el mismo archivo
  }
  return (
    <label className={['osia-mediafield', round ? 'osia-mediafield--round' : ''].filter(Boolean).join(' ')}>
      <Text variant="caption" as="span">
        {label}
      </Text>
      <span className="osia-mediafield__drop">
        {previewUrl ? (
          <img src={previewUrl} alt="" />
        ) : (
          <>
            {icon}
            {hint && (
              <Text variant="meta" tone="subtle">
                {hint}
              </Text>
            )}
          </>
        )}
        {uploading && <Skeleton variant="block" width="100%" height="100%" />}
      </span>
      <input className="osia-mediafield__input" type="file" accept={accept} onChange={onChange} aria-label={label} />
    </label>
  );
}
