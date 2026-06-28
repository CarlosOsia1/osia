-- ============================================================================
-- OSIA · S3.3-H2 · Conteo desnormalizado de reacciones (posts.reaction_count)
-- Trigger que mantiene posts.reaction_count desde social.reactions (insert/delete). El feed/perfil
-- necesitan el número en O(1) sin COUNT(*). Fuente de verdad: las filas de social.reactions; el campo
-- es caché por trigger (espejo de social.sync_follow_counts). Forward-only.
-- ============================================================================

CREATE OR REPLACE FUNCTION social.sync_reaction_count() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE social.posts SET reaction_count = reaction_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE social.posts SET reaction_count = GREATEST(reaction_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_reaction_count
  AFTER INSERT OR DELETE ON social.reactions
  FOR EACH ROW EXECUTE FUNCTION social.sync_reaction_count();

-- Backfill idempotente desde las reacciones existentes (con 0 reacciones da 0). Re-aplicable sin daño.
UPDATE social.posts p SET reaction_count = (
  SELECT count(*) FROM social.reactions r WHERE r.post_id = p.id
);
