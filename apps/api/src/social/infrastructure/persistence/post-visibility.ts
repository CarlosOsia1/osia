/**
 * Predicado SQL ÚNICO de "¿el lector puede VER este post?" (S3.10-QA). Reimpone DOS reglas a la vez:
 *  1. la visibilidad del propio post (`public` / `followers` / `private`=solo-autor), y
 *  2. la PRIVACIDAD DE LA CUENTA autora (S3.8): una cuenta privada oculta TODO su contenido a quien no es
 *     dueño ni seguidor ACTIVO, sin importar la visibilidad del post (un `public` de cuenta privada NO es
 *     visible para un no-seguidor).
 *
 * Antes esta regla estaba duplicada e INCOMPLETA (no miraba `is_private`) en getById, listReactors,
 * setReaction, createComment y listComments — un hueco que un no-seguidor explotaba por deep-link. Ahora
 * vive aquí y se reusa en todos esos caminos (read Y write) + en la lectura del feed (defensa en
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
  return `${post}.deleted_at IS NULL AND (
    ${post}.author_account_id = ${viewer}
    OR ((${authorNotPrivate} OR ${activeFollow})
        AND (${post}.visibility = 'public'
             OR (${post}.visibility = 'followers' AND ${activeFollow})))
  )`;
}
