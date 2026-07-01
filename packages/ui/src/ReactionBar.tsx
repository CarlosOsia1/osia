import { IconStar } from './icons';

/**
 * ReactionBar — la reacción ÚNICA de OSIA: la ESTRELLA (un "me gusta" de marca). Una por post: se da o se
 * quita (toggle, lo resuelve el llamador). El contador abre la lista de "quién reaccionó". Agnóstico de
 * dominio (recibe estado + textos por props). Decisión de Carlos: se descartaron luna/sol.
 */
export type ReactionBarProps = {
  /** ¿El lector ya dio su estrella a este post? */
  reacted: boolean;
  count: number;
  /** Dar/quitar la estrella. */
  onToggle: () => void;
  onShowReactors?: () => void;
  /** aria-label del botón (i18n, p.ej. "Me gusta"). */
  label: string;
  /** Texto del contador ("12 me gusta"); clicable para ver quién reaccionó. */
  countLabel: string;
  pending?: boolean;
};

export function ReactionBar({
  reacted,
  count,
  onToggle,
  onShowReactors,
  label,
  countLabel,
  pending = false,
}: ReactionBarProps) {
  return (
    <div className="osia-reactbar">
      <button
        type="button"
        className="osia-reactbtn"
        data-active={reacted || undefined}
        aria-pressed={reacted}
        aria-label={label}
        disabled={pending}
        onClick={onToggle}
      >
        <IconStar />
      </button>
      {count > 0 && (
        <button type="button" className="osia-reactbar__count" onClick={onShowReactors}>
          {countLabel}
        </button>
      )}
    </div>
  );
}
