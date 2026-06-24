import type { ReactNode } from 'react';
import { Dot } from '../Dot';

export type PassportCardProps = {
  handle: string;
  displayName: string;
  accentColor: string;
  avatarUrl?: string | null;
  popularityPoints?: number;
  /** Etiqueta i18n del contador de reconocimiento (la app la traduce, §2.3). */
  popularityLabel?: string;
  /** Etiqueta i18n del estado de presencia. */
  presenceLabel?: string;
  /** Wordmark de marca (la app pasa OSIA.name); decorativo, sin él no se dibuja. */
  watermark?: string;
  /** Acciones (p. ej. "editar pasaporte"); van al pie de la tarjeta. */
  children?: ReactNode;
};

/**
 * PassportCard (S1.7-H1) — la "llave celeste" del residente: identidad que viaja entre apps.
 * Tonta: recibe datos + etiquetas ya traducidas. Estetica de lujo (champan sobre onix, foil con
 * shimmer, espacio negativo). Avatar de F1 = circulo de acento (el avatar 3D vive en El Mundo).
 */
export function PassportCard({
  handle,
  displayName,
  accentColor,
  avatarUrl,
  popularityPoints = 0,
  popularityLabel,
  presenceLabel,
  watermark,
  children,
}: PassportCardProps) {
  return (
    <article className="osia-passport-card">
      {watermark ? (
        <span className="osia-passport-card__watermark" aria-hidden>
          {watermark}
        </span>
      ) : null}
      <header className="osia-passport-card__id">
        <div className="osia-passport-card__avatar" aria-hidden style={{ background: accentColor }}>
          {avatarUrl ? <img src={avatarUrl} alt="" /> : null}
        </div>
        <div className="osia-passport-card__name">
          <span className="osia-overline">@{handle}</span>
          <h2>{displayName}</h2>
          {presenceLabel ? (
            <span className="osia-passport-card__presence">
              <Dot color="var(--color-accent)" glow />
              {presenceLabel}
            </span>
          ) : null}
        </div>
      </header>

      <dl className="osia-passport-card__stats">
        <div>
          <dt>{popularityLabel}</dt>
          <dd>{popularityPoints.toLocaleString()}</dd>
        </div>
      </dl>

      {children ? <footer className="osia-passport-card__actions">{children}</footer> : null}
    </article>
  );
}
