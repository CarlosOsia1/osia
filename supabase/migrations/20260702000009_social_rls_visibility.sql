-- Ola 1E — Alinear la RLS de lectura del Tejido Social al predicado de visibilidad UNIFICADO.
--
-- Contexto: la verdad de "¿puedo ver este post?" la impone hoy `apps/api` con service_role (que BYPASSA
-- RLS) reusando `post-visibility.ts` (visibilidad del post + PRIVACIDAD de la cuenta autora + BLOQUEO).
-- La RLS de `posts_select_visible` quedó atrás: solo miraba la visibilidad del post, NO la privacidad de
-- cuenta ni el bloqueo — el mismo hueco que el API cerró (un `public` de cuenta privada era RLS-visible
-- para un no-seguidor). La RLS es defensa en profundidad (el schema `social` no se expone por PostgREST),
-- pero debe COINCIDIR con la regla real. Este migration la pone al día.
--
-- Fuente única en SQL: una función `SECURITY DEFINER` que espeja EXACTAMENTE el predicado de TS. Definer
-- para que sus lecturas internas de follows/profile_cards NO recursen por la RLS de esas tablas (evita
-- ambigüedades de sub-lectura); STABLE + search_path fijado (anti-hijack). Las 3 policies la reusan (DRY).

CREATE OR REPLACE FUNCTION social.post_visible_to(p_post_id uuid, p_viewer uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = social, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM social.posts po
    WHERE po.id = p_post_id
      AND po.deleted_at IS NULL
      AND (
        po.author_account_id = p_viewer
        OR (
          -- No bloqueado en NINGUNA dirección.
          NOT EXISTS (
            SELECT 1 FROM social.follows b
            WHERE b.status = 'blocked'
              AND ((b.follower_account_id = p_viewer AND b.followee_account_id = po.author_account_id)
                OR (b.follower_account_id = po.author_account_id AND b.followee_account_id = p_viewer))
          )
          -- Cuenta NO privada, o soy seguidor ACTIVO (la privacidad oculta TODO a los de afuera).
          AND (
            NOT EXISTS (
              SELECT 1 FROM social.profile_cards pc
              WHERE pc.account_id = po.author_account_id AND pc.is_private
            )
            OR EXISTS (
              SELECT 1 FROM social.follows f
              WHERE f.follower_account_id = p_viewer
                AND f.followee_account_id = po.author_account_id
                AND f.status = 'active'
            )
          )
          -- Y la visibilidad del propio post (public / followers-con-follow-activo).
          AND (
            po.visibility = 'public'
            OR (po.visibility = 'followers' AND EXISTS (
              SELECT 1 FROM social.follows f
              WHERE f.follower_account_id = p_viewer
                AND f.followee_account_id = po.author_account_id
                AND f.status = 'active'
            ))
          )
        )
      )
  );
$$;

GRANT EXECUTE ON FUNCTION social.post_visible_to(uuid, uuid) TO authenticated;

-- posts: la visibilidad completa (incluye privacidad de cuenta + bloqueo).
DROP POLICY IF EXISTS posts_select_visible ON social.posts;
CREATE POLICY posts_select_visible ON social.posts
  FOR SELECT TO authenticated
  USING (social.post_visible_to(id, auth.uid()));

-- comments: visibles solo si su post es visible para el lector (antes: solo "el post existe").
DROP POLICY IF EXISTS comments_select_on_post ON social.comments;
CREATE POLICY comments_select_on_post ON social.comments
  FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND social.post_visible_to(post_id, auth.uid()));

-- reactions: visibles solo si su post es visible para el lector (antes: solo "el post existe").
DROP POLICY IF EXISTS reactions_select_on_post ON social.reactions;
CREATE POLICY reactions_select_on_post ON social.reactions
  FOR SELECT TO authenticated
  USING (social.post_visible_to(post_id, auth.uid()));
