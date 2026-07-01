import type { CSSProperties } from 'react';

/**
 * Avatar — foto de perfil circular con respaldo a iniciales y punto de presencia opcional. Tonto:
 * recibe `src`/`name`/`presence` por props. El tamaño es una dimensión de API (no un color/espacio
 * crudo), se pasa en px y se traduce a `inline/block-size`. Consume tokens de styles.css.
 */
export type AvatarPresence = 'online' | 'offline';

export type AvatarProps = {
  /** URL de la foto; si falta, se muestran las iniciales de `name`. */
  src?: string | null;
  /** Nombre para alt + iniciales de respaldo. */
  name: string;
  /** Diámetro en px (dimensión de componente). */
  size?: number;
  /** Aro con glow índigo (destaca al propio/hero). */
  ring?: boolean;
  /** Punto de presencia; omitir para no mostrarlo. */
  presence?: AvatarPresence;
  className?: string;
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '';
  const second = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + second).toUpperCase() || '·';
}

export function Avatar({ src, name, size = 40, ring = false, presence, className }: AvatarProps) {
  const style: CSSProperties = {
    inlineSize: `${size}px`,
    blockSize: `${size}px`,
    fontSize: `${Math.round(size * 0.36)}px`,
  };
  const cls = ['osia-avatar', ring ? 'osia-avatar--ring' : '', className].filter(Boolean).join(' ');
  return (
    <span className={cls} style={style}>
      {src ? (
        <img className="osia-avatar__img" src={src} alt={name} loading="lazy" />
      ) : (
        <span className="osia-avatar__fallback" aria-label={name} role="img">
          {initials(name)}
        </span>
      )}
      {presence && (
        <span
          className="osia-avatar__presence"
          data-online={presence === 'online' || undefined}
          aria-hidden="true"
        />
      )}
    </span>
  );
}
