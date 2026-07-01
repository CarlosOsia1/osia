import { IconStar, IconMoon, IconSun } from './icons';

/** Reacción celestial (forma estructural; el contrato `ReactionKind` vive en @osia/shared). */
export type ReactionBarKind = 'star' | 'moon' | 'sun';

/**
 * ReactionBar — las tres reacciones celestiales de marca (estrella · luna · sol). Una por post: elegir
 * otra reemplaza; volver a pulsar la activa la quita (lo resuelve el llamador). El contador total abre la
 * lista de "quién reaccionó". El design system es agnóstico de dominio (recibe la forma por props).
 */
const KINDS: ReadonlyArray<{ kind: ReactionBarKind; Icon: typeof IconStar; label: string }> = [
  { kind: 'star', Icon: IconStar, label: 'star' },
  { kind: 'moon', Icon: IconMoon, label: 'moon' },
  { kind: 'sun', Icon: IconSun, label: 'sun' },
];

export type ReactionBarProps = {
  viewerReaction: ReactionBarKind | null;
  reactionCount: number;
  onReact: (kind: ReactionBarKind) => void;
  onShowReactors?: () => void;
  /** aria-labels por reacción (i18n): { star, moon, sun }. */
  kindLabels: Record<ReactionBarKind, string>;
  /** Texto del contador ("12 reacciones"). */
  countLabel: string;
  pending?: boolean;
};

export function ReactionBar({
  viewerReaction,
  reactionCount,
  onReact,
  onShowReactors,
  kindLabels,
  countLabel,
  pending = false,
}: ReactionBarProps) {
  return (
    <div className="osia-reactbar">
      {KINDS.map(({ kind, Icon }) => (
        <button
          key={kind}
          type="button"
          className="osia-reactbtn"
          data-active={viewerReaction === kind || undefined}
          aria-pressed={viewerReaction === kind}
          aria-label={kindLabels[kind]}
          disabled={pending}
          onClick={() => onReact(kind)}
        >
          <Icon />
        </button>
      ))}
      {reactionCount > 0 && (
        <button type="button" className="osia-reactbar__count" onClick={onShowReactors}>
          {countLabel}
        </button>
      )}
    </div>
  );
}
