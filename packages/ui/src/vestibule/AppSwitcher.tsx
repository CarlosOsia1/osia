export type AppSwitcherExperience = { id: string; name: string; live: boolean };

export type AppSwitcherProps = {
  experiences: readonly AppSwitcherExperience[];
  currentId?: string;
  onSwitch?: (id: string) => void;
  /** Ancla de marca/wordmark (la app pasa OSIA.name; sin hardcodear en el componente). */
  brandLabel: string;
};

/**
 * AppSwitcher (S1.7-H2) — conmutador DISCRETO, nunca una barra de tabs. En F1 es casi solo el
 * ancla de marca + un punto por experiencia viva (hoy: una). Aditivo: mas experiencias en el
 * catalogo aparecen como mas puntos sin tocar el componente.
 */
export function AppSwitcher({ experiences, currentId, onSwitch, brandLabel }: AppSwitcherProps) {
  return (
    <nav className="osia-appswitcher" aria-label={brandLabel}>
      <span className="osia-appswitcher__brand">{brandLabel}</span>
      <span className="osia-appswitcher__dots">
        {experiences.map((exp) => (
          <button
            key={exp.id}
            type="button"
            className="osia-appswitcher__dot"
            data-current={exp.id === currentId || undefined}
            disabled={!exp.live}
            aria-label={exp.name}
            aria-current={exp.id === currentId ? 'true' : undefined}
            onClick={() => onSwitch?.(exp.id)}
          />
        ))}
      </span>
    </nav>
  );
}
