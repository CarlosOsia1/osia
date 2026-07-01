-- ============================================================================
-- OSIA · S3.9 · Solicitudes de seguimiento (estado `pending`) para cuentas privadas
-- Seguir una cuenta privada crea la arista en `pending` (no cuenta ni concede visibilidad); al ACEPTAR
-- pasa a `active`. Se extiende el CHECK de status y el trigger de conteos para manejar el UPDATE de
-- estado (pending->active suma; active->pending resta). Índice para las solicitudes entrantes.
-- Forward-only.
-- ============================================================================

BEGIN;

ALTER TABLE social.follows DROP CONSTRAINT follows_status_check;
ALTER TABLE social.follows
  ADD CONSTRAINT follows_status_check CHECK (status IN ('active', 'pending', 'blocked'));

-- Conteos: ahora también en UPDATE de status (aceptar/revertir una solicitud).
CREATE OR REPLACE FUNCTION social.sync_follow_counts() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'active' THEN
      UPDATE identity.profiles SET following_count = following_count + 1
        WHERE account_id = NEW.follower_account_id;
      UPDATE identity.profiles SET followers_count = followers_count + 1
        WHERE account_id = NEW.followee_account_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status <> 'active' AND NEW.status = 'active' THEN
      UPDATE identity.profiles SET following_count = following_count + 1
        WHERE account_id = NEW.follower_account_id;
      UPDATE identity.profiles SET followers_count = followers_count + 1
        WHERE account_id = NEW.followee_account_id;
    ELSIF OLD.status = 'active' AND NEW.status <> 'active' THEN
      UPDATE identity.profiles SET following_count = GREATEST(following_count - 1, 0)
        WHERE account_id = NEW.follower_account_id;
      UPDATE identity.profiles SET followers_count = GREATEST(followers_count - 1, 0)
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

DROP TRIGGER trg_follow_counts ON social.follows;
CREATE TRIGGER trg_follow_counts
  AFTER INSERT OR UPDATE OR DELETE ON social.follows
  FOR EACH ROW EXECUTE FUNCTION social.sync_follow_counts();

-- Solicitudes entrantes pendientes (lo que revisa el dueño en "Amigos", keyset por recencia).
CREATE INDEX idx_follows_pending ON social.follows (followee_account_id, created_at DESC, id DESC)
  WHERE status = 'pending';

COMMIT;
