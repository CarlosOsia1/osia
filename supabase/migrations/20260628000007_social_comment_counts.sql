-- ============================================================================
-- OSIA · S3.3-H3 · Conteo desnormalizado de comentarios (posts.comment_count)
-- Trigger que mantiene posts.comment_count desde social.comments. Cuenta SOLO comentarios vivos
-- (deleted_at IS NULL): +1 al insertar, -1 al soft-borrar (UPDATE deleted_at NULL→no-NULL) y al borrar
-- físico de uno vivo. Caché por trigger (espejo de sync_reaction_count). Forward-only.
-- ============================================================================

CREATE OR REPLACE FUNCTION social.sync_comment_count() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.deleted_at IS NULL THEN
      UPDATE social.posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- soft-delete: pasa de vivo a borrado.
    IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
      UPDATE social.posts SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = NEW.post_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.deleted_at IS NULL THEN
      UPDATE social.posts SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = OLD.post_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_comment_count
  AFTER INSERT OR UPDATE OR DELETE ON social.comments
  FOR EACH ROW EXECUTE FUNCTION social.sync_comment_count();

-- Backfill idempotente desde los comentarios vivos. Re-aplicable sin daño.
UPDATE social.posts p SET comment_count = (
  SELECT count(*) FROM social.comments c WHERE c.post_id = p.id AND c.deleted_at IS NULL
);
