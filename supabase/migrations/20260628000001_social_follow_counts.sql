-- ============================================================================
-- OSIA · S3.2-H2 · Conteos desnormalizados del grafo social
-- profiles.followers_count / following_count + trigger que los mantiene desde social.follows.
-- El feed/perfil necesitan estos números en O(1) sin COUNT(*) (docs/04 §7.2). Fuente de verdad:
-- el grafo (social.follows); estos campos son caché mantenido por trigger. Forward-only.
-- ============================================================================

ALTER TABLE identity.profiles
  ADD COLUMN followers_count integer NOT NULL DEFAULT 0 CHECK (followers_count >= 0),
  ADD COLUMN following_count integer NOT NULL DEFAULT 0 CHECK (following_count >= 0);

-- Mantiene los conteos al crear/borrar una arista ACTIVA. El bloqueo (status='blocked') no existe aún
-- como camino de escritura; cuando se agregue (UPDATE de status), sumar una rama TG_OP='UPDATE'.
CREATE OR REPLACE FUNCTION social.sync_follow_counts() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'active' THEN
      UPDATE identity.profiles SET following_count = following_count + 1
        WHERE account_id = NEW.follower_account_id;
      UPDATE identity.profiles SET followers_count = followers_count + 1
        WHERE account_id = NEW.followee_account_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.status = 'active' THEN
      UPDATE identity.profiles SET following_count = GREATEST(following_count - 1, 0)
        WHERE account_id = OLD.follower_account_id;
      UPDATE identity.profiles SET followers_count = GREATEST(followers_count - 1, 0)
        WHERE account_id = OLD.followee_account_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_follow_counts
  AFTER INSERT OR DELETE ON social.follows
  FOR EACH ROW EXECUTE FUNCTION social.sync_follow_counts();

-- Backfill idempotente desde el grafo (recalcula; con 0 follows da 0). Re-aplicable sin daño.
UPDATE identity.profiles p SET
  followers_count = (SELECT count(*) FROM social.follows f
                       WHERE f.followee_account_id = p.account_id AND f.status = 'active'),
  following_count = (SELECT count(*) FROM social.follows f
                       WHERE f.follower_account_id = p.account_id AND f.status = 'active');
