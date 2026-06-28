-- ============================================================================
-- OSIA · S3.1-H3 · Row Level Security del Tejido Social (deny-all + ownership/visibilidad)
--
-- Defensa en profundidad (docs/09, docs/04 §7.4): RLS es la ÚLTIMA línea, no la única. El cliente
-- NO toca `social` por PostgREST (Exposed schemas deja solo public/graphql_public); todo va por
-- apps/api con `service_role` (BYPASSRLS). Aun así, si algún día se expone, el ownership se sostiene.
--
-- ESCRITURAS: service-only (no se conceden INSERT/UPDATE/DELETE a `authenticated`) — el alta de
-- follow/post/reacción/comentario pasa por apps/api (guards: email verificado, rate-limit, anti-self).
-- LECTURAS: se conceden a `authenticated` con políticas de visibilidad/propiedad.
-- ============================================================================

GRANT USAGE ON SCHEMA social TO authenticated;
GRANT USAGE ON SCHEMA social TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA social TO service_role;

-- ============================ follows ============================
ALTER TABLE social.follows ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON social.follows TO authenticated;
-- Veo una arista si soy una de sus puntas (las listas públicas de followers/following van por
-- apps/api con service_role, que no pasa por esta policy).
CREATE POLICY follows_select_related ON social.follows
  FOR SELECT TO authenticated
  USING (follower_account_id = auth.uid() OR followee_account_id = auth.uid());

-- ============================ posts ============================
ALTER TABLE social.posts ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON social.posts TO authenticated;
-- Lectura por visibilidad: autor siempre; público a todos; followers-only si el lector sigue al autor.
CREATE POLICY posts_select_visible ON social.posts
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL AND (
      author_account_id = auth.uid()
      OR visibility = 'public'
      OR (visibility = 'followers' AND EXISTS (
        SELECT 1 FROM social.follows f
        WHERE f.follower_account_id = auth.uid()
          AND f.followee_account_id = social.posts.author_account_id
          AND f.status = 'active'
      ))
    )
  );

-- ============================ reactions ============================
ALTER TABLE social.reactions ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON social.reactions TO authenticated;
-- Veo reacciones de un post si el post existe (la visibilidad del post la gobierna su propia policy).
CREATE POLICY reactions_select_on_post ON social.reactions
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM social.posts p WHERE p.id = post_id AND p.deleted_at IS NULL));

-- ============================ comments ============================
ALTER TABLE social.comments ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON social.comments TO authenticated;
CREATE POLICY comments_select_on_post ON social.comments
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND EXISTS (SELECT 1 FROM social.posts p WHERE p.id = post_id AND p.deleted_at IS NULL)
  );

-- ============================ feed_items ============================
-- El feed materializado es estrictamente del dueño. La inserción (fan-out) es service-only.
ALTER TABLE social.feed_items ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON social.feed_items TO authenticated;
CREATE POLICY feed_items_select_own ON social.feed_items
  FOR SELECT TO authenticated
  USING (account_id = auth.uid());

-- ============================ notifications ============================
-- Solo el destinatario ve sus notificaciones; el marcado de leídas pasa por apps/api (service).
ALTER TABLE social.notifications ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON social.notifications TO authenticated;
CREATE POLICY notifications_select_own ON social.notifications
  FOR SELECT TO authenticated
  USING (account_id = auth.uid());
