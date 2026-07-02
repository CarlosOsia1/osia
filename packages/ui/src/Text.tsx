import { createElement, type ElementType, type HTMLAttributes } from 'react';

export type TextVariant =
  | 'display'
  | 'title'
  | 'body'
  | 'label'
  | 'overline'
  | 'value'
  // Variantes editoriales (app-documento, p.ej. La Red Social — escala rem generosa, §Fase 3.5).
  // `hero` = Italiana ceremonial; el resto = Jost, como manda §2.5.
  | 'hero'
  | 'heading'
  | 'subheading'
  | 'read'
  | 'meta'
  | 'caption';
export type TextTone = 'default' | 'strong' | 'subtle' | 'muted' | 'accent' | 'success';

export type TextProps = HTMLAttributes<HTMLElement> & {
  /** Elemento HTML a renderizar (default según la variante). */
  as?: ElementType;
  variant?: TextVariant;
  tone?: TextTone;
  /** Asocia el texto a un control cuando `as="label"`. */
  htmlFor?: string;
  /** Texto SOBRE la escena 3D: añade un halo oscuro (text-shadow) → legible de día y de noche. */
  scrim?: boolean;
};

const DEFAULT_TAG: Record<TextVariant, ElementType> = {
  display: 'h1',
  title: 'h2',
  body: 'span',
  label: 'span',
  overline: 'span',
  value: 'span',
  hero: 'h1',
  heading: 'h2',
  subheading: 'h3',
  read: 'p',
  meta: 'span',
  caption: 'span',
};

/**
 * Text — la ÚNICA puerta tipográfica del design system (CLAUDE.md §2.5). Ningún texto visible se
 * renderiza con un elemento nativo estilizado a mano: todo pasa por aquí, que elige la FUENTE por
 * ROL (variant `display` = Italiana de marca; el resto = Jost), el tracking y `tabular-nums`. La
 * app solo elige variante/tono; un cambio tipográfico se hace UNA vez, aquí.
 */
export function Text({
  as,
  variant = 'body',
  tone = 'default',
  scrim = false,
  className,
  ...rest
}: TextProps) {
  const tag: ElementType = as ?? DEFAULT_TAG[variant];
  const cls = [
    'osia-text',
    `osia-text--${variant}`,
    tone !== 'default' ? `osia-text--${tone}` : '',
    scrim ? 'osia-text--scrim' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  return createElement(tag, { className: cls, ...rest });
}
