'use client';

import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { IconX } from './icons';
import { Text } from './Text';

/**
 * Lightbox — visor de media a pantalla completa (R2, El Salón): la foto/video se contempla
 * sobre ónix casi puro, con cromo mínimo. Diálogo modal (portal + aria-modal + foco devuelto),
 * `Escape` cierra, `ArrowLeft`/`ArrowRight` navegan entre adjuntos, contador «n / m». El video
 * se reproduce con controles nativos. La animación respeta prefers-reduced-motion (styles.css).
 *
 * i18n (§2.3): sin strings propios — la app pasa `closeLabel`/`prevLabel`/`nextLabel` traducidos.
 */
export type LightboxItem = { url: string; kind: 'image' | 'video' };

export type LightboxProps = {
  items: LightboxItem[];
  /** Índice inicial (adjunto clicado). */
  initialIndex?: number;
  onClose: () => void;
  /** Nombre accesible del visor (p.ej. «Visor de media»), ya traducido. */
  label: string;
  closeLabel: string;
  prevLabel: string;
  nextLabel: string;
};

export function Lightbox({
  items,
  initialIndex = 0,
  onClose,
  label,
  closeLabel,
  prevLabel,
  nextLabel,
}: LightboxProps) {
  const [index, setIndex] = useState(() => Math.min(Math.max(initialIndex, 0), items.length - 1));
  const rootRef = useRef<HTMLDivElement>(null);
  const prevFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    prevFocus.current = document.activeElement as HTMLElement | null;
    rootRef.current?.focus();
    return () => prevFocus.current?.focus?.();
  }, []);

  const item = items[index];
  if (!item || typeof document === 'undefined') return null;

  const goTo = (next: number): void => {
    if (items.length < 2) return;
    setIndex(((next % items.length) + items.length) % items.length);
  };

  function onKeyDown(e: ReactKeyboardEvent<HTMLDivElement>): void {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      goTo(index + 1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      goTo(index - 1);
    }
  }

  return createPortal(
    <div
      ref={rootRef}
      className="osia-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={label}
      tabIndex={-1}
      onKeyDown={onKeyDown}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <button type="button" className="osia-lightbox__close" aria-label={closeLabel} onClick={onClose}>
        <IconX />
      </button>

      {item.kind === 'video' ? (
        // Video subido por residentes: no existe pista de subtítulos que ofrecer.
        <video key={item.url} className="osia-lightbox__media" src={item.url} controls autoPlay />
      ) : (
        <img key={item.url} className="osia-lightbox__media" src={item.url} alt="" />
      )}

      {items.length > 1 && (
        <>
          <button
            type="button"
            className="osia-lightbox__nav"
            data-dir="prev"
            aria-label={prevLabel}
            onClick={() => goTo(index - 1)}
          >
            ‹
          </button>
          <button
            type="button"
            className="osia-lightbox__nav"
            data-dir="next"
            aria-label={nextLabel}
            onClick={() => goTo(index + 1)}
          >
            ›
          </button>
          <Text variant="meta" tone="subtle" className="osia-lightbox__counter">
            {`${index + 1} / ${items.length}`}
          </Text>
        </>
      )}
    </div>,
    document.body,
  );
}
