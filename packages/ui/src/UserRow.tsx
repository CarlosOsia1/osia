import { createElement, type ElementType, type ReactNode } from 'react';
import { Avatar, type AvatarPresence } from './Avatar';
import { Text } from './Text';

/**
 * UserRow — fila de persona reutilizable (Amigos, Descubrir, Buscar, "quién reaccionó"): avatar +
 * nombre + @handle, con una acción a la derecha (slot). Si se pasa `href` + `LinkComponent`, el
 * nombre/avatar enlazan al perfil (href real). Tonto; compone Avatar + Text de @osia/ui (§2.1).
 */
export type UserRowProps = {
  name: string;
  handle: string;
  avatarUrl?: string | null;
  presence?: AvatarPresence;
  /** Ruta al perfil (opcional); requiere `LinkComponent` para navegación cliente. */
  href?: string;
  LinkComponent?: ElementType;
  /** Acción a la derecha (p.ej. FollowButton, Aceptar/Rechazar). */
  children?: ReactNode;
};

export function UserRow({ name, handle, avatarUrl, presence, href, LinkComponent = 'a', children }: UserRowProps) {
  const identity = (
    <>
      <Avatar src={avatarUrl ?? undefined} name={name} size={44} presence={presence} />
      <span className="osia-userrow__id">
        <Text variant="subheading" as="span">
          {name}
        </Text>
        <Text variant="meta" tone="subtle">
          {`@${handle}`}
        </Text>
      </span>
    </>
  );
  return (
    <div className="osia-userrow">
      {href
        ? createElement(LinkComponent, { href, className: 'osia-userrow__link' }, identity)
        : identity}
      {children && <span className="osia-userrow__action">{children}</span>}
    </div>
  );
}
