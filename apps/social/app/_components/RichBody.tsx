'use client';

import Link from 'next/link';
import { Text, type TextProps } from '@osia/ui';
import { routes } from '../../lib/routes';

/** Espejo de render de `HANDLE_PATTERN`/`parseMentions` (shared): tokens `@handle` en el texto. */
const MENTION_SPLIT = /(@[a-zA-Z0-9_]{3,20})/g;

/**
 * RichBody (R3) — pinta el cuerpo de un post/comentario convirtiendo cada `@handle` en un
 * enlace REAL al perfil, como elementos React (nunca HTML inyectado — cero XSS por diseño).
 * El backend ya notifica menciones; esto las vuelve navegables.
 */
export function RichBody({ text, ...textProps }: { text: string } & Omit<TextProps, 'children'>) {
  const parts = text.split(MENTION_SPLIT);
  return (
    <Text {...textProps}>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <Link key={i} href={routes.perfil(part.slice(1).toLowerCase())} className="osia-mention">
            {part}
          </Link>
        ) : (
          part
        ),
      )}
    </Text>
  );
}
