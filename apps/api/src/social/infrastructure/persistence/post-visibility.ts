/**
 * Predicado SQL ÚNICO de "¿el lector puede VER este post?" (S3.10-QA; bloqueo en R4.4).
 * Reimpone TRES reglas a la vez:
 *  1. la visibilidad del propio post (`public` / `followers` / `private`=solo-autor),
 *  2. la PRIVACIDAD DE LA CUENTA autora (S3.8): una cuenta privada oculta TODO su contenido a quien no es
 *     dueño ni seguidor ACTIVO, sin importar la visibilidad del post (un `public` de cuenta privada NO es
 *     visible para un no-seguidor), y
 *  3. el BLOQUEO (R4.4): si lector y autor están bloqueados en CUALQUIER dirección, no hay post — ni
 *     leer, ni reaccionar, ni comentar, ni guardar, ni ecoar (todos los caminos reusan este predicado).
 *
 * Antes la regla 2 estaba duplicada e INCOMPLETA (no miraba `is_private`) en getById, listReactors,
 * setReaction, createComment y listComments — un hueco que un no-seguidor explotaba por deep-link. Ahora
 * vive aquí y se reusa en todos esos caminos (read Y write) + feed/perfil/guardados/eco (defensa en
 * profundidad). Usa subconsultas correlacionadas para no exigir JOINs al llamador.
 *
 * @param post  Referencia a la fila de `social.posts` (alias como `po`, o `social.posts`).
 * @param viewer  Placeholder del lector (p.ej. `$2`).
 */
export function postVisiblePredicate(post: string, viewer: string): string {
  const activeFollow = `EXISTS (SELECT 1 FROM social.follows f
      WHERE f.follower_account_id = ${viewer} AND f.followee_account_id = ${post}.author_account_id
        AND f.status = 'active')`;
  const authorNotPrivate = `NOT EXISTS (SELECT 1 FROM social.profile_cards pc
      WHERE pc.account_id = ${post}.author_account_id AND pc.is_private)`;
  const notBlocked = `NOT EXISTS (SELECT 1 FROM social.follows b
      WHERE b.status = 'blocked'
        AND ((b.follower_account_id = ${viewer} AND b.followee_account_id = ${post}.author_account_id)
          OR (b.follower_account_id = ${post}.author_account_id AND b.followee_account_id = ${viewer})))`;
  return `${post}.deleted_at IS NULL AND (
    ${post}.author_account_id = ${viewer}
    OR (${notBlocked}
        AND (${authorNotPrivate} OR ${activeFollow})
        AND (${post}.visibility = 'public'
             OR (${post}.visibility = 'followers' AND ${activeFollow})))
  )`;
}
