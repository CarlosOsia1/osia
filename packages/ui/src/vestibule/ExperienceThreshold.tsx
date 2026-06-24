export type ExperienceThresholdProps = {
  /** Nombre ceremonial (Italiana), p. ej. "El Mundo". Ya traducido por la app. */
  name: string;
  /** Una linea en Jost que invita a cruzar. */
  tagline: string;
  /** Texto del CTA (p. ej. "Entrar"). */
  ctaLabel: string;
  /** 'live' (cruzable) o 'coming-soon' (atenuada, sin deep-link). */
  status?: 'live' | 'coming-soon';
  /** Etiqueta para puertas que aun no abren. */
  comingSoonLabel?: string;
  /** Se invoca al cruzar (solo si status === 'live'). */
  onCross?: () => void;
};

/**
 * ExperienceThreshold (S1.7-H2) — una PUERTA editorial, no un icono de app. Nombre grande en
 * Italiana, tagline en Jost, fondo de constelacion sutil. Hover: glow champan + leve escala.
 * Se renderiza desde el catalogo declarativo (LIVE_EXPERIENCES); anadir una puerta = un dato mas.
 */
export function ExperienceThreshold({
  name,
  tagline,
  ctaLabel,
  status = 'live',
  comingSoonLabel,
  onCross,
}: ExperienceThresholdProps) {
  const live = status === 'live';
  return (
    <button
      type="button"
      className="osia-threshold"
      data-status={status}
      disabled={!live}
      onClick={live ? onCross : undefined}
      aria-label={name}
    >
      <span className="osia-threshold__constellation" aria-hidden />
      <span className="osia-threshold__body">
        <span className="osia-threshold__name">{name}</span>
        <span className="osia-threshold__tagline">{tagline}</span>
      </span>
      <span className="osia-threshold__cta">{live ? ctaLabel : comingSoonLabel}</span>
    </button>
  );
}
