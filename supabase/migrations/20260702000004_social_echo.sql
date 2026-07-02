-- ============================================================================
-- OSIA · Ola 3 · R4.3 · Eco: amplificar un post ajeno hacia tu propio feed
-- El eco ES un post (`kind='echo'` + `referenced_post_id`): reusa gratis el fan-out del feed,
-- la visibilidad, los contadores, el soft-delete y las reacciones/comentarios sobre el propio
-- eco (semántica quote). Reglas:
--  - Solo se ecoa un post PÚBLICO de cuenta NO privada (lo impone el CTE del use-case).
--  - Ecoar un eco resuelve al ORIGINAL raíz (sin cadenas).
--  - Eco simple (sin nota): único por (autor, original) vivo — idempotente, sin spam.
--  - FK ON DELETE SET NULL: si el original muere, el eco sobrevive con «contenido no disponible».
--  - `echo_count` cacheado por trigger (espejo de comment_count, soft-delete aware).
--  - SIN reputación por eco (anti-grind, decisión de Carlos).
-- Forward-only.
-- ============================================================================

ALTER TABLE social.posts
  ADD COLUMN IF NOT EXISTS referenced_post_id uuid REFERENCES social.posts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS echo_count integer NOT NULL DEFAULT 0;

-- `kind` gana 'echo'.
ALTER TABLE social.posts DROP CONSTRAINT posts_kind_check;
ALTER TABLE social.posts
  ADD CONSTRAINT posts_kind_check CHECK (kind IN ('text', 'image', 'video', 'moment', 'echo'));

-- Un eco puede ir VACÍO (la referencia es el contenido); el resto sigue exigiendo texto o media.
ALTER TABLE social.posts DROP CONSTRAINT ck_posts_has_content;
ALTER TABLE social.posts
  ADD CONSTRAINT ck_posts_has_content CHECK (
    referenced_post_id IS NOT NULL
    OR body IS NOT NULL
    OR jsonb_array_length(media) > 0
  );

-- La coherencia del eco: kind 'echo' ⟺ tiene referencia (mientras viva el original; SET NULL la
-- suelta al morir aquel, por eso solo se exige al nacer vía use-case, no por CHECK).

-- Anti-spam: UN eco simple (sin nota) vivo por (autor, original). El quote (con nota) es libre.
CREATE UNIQUE INDEX IF NOT EXISTS uq_posts_simple_echo
  ON social.posts (author_account_id, referenced_post_id)
  WHERE kind = 'echo' AND body IS NULL AND deleted_at IS NULL;

-- Lookups del original (trigger de conteo, ON DELETE SET NULL).
CREATE INDEX IF NOT EXISTS idx_posts_referenced
  ON social.posts (referenced_post_id)
  WHERE referenced_post_id IS NOT NULL;

-- Contador de ecos del ORIGINAL (espejo de sync_comment_count; cuenta solo ecos vivos).
CREATE OR REPLACE FUNCTION social.sync_echo_count() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.kind = 'echo' AND NEW.referenced_post_id IS NOT NULL AND NEW.deleted_at IS NULL THEN
      UPDATE social.posts SET echo_count = echo_count + 1 WHERE id = NEW.referenced_post_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.kind = 'echo' AND NEW.referenced_post_id IS NOT NULL
       AND OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
      UPDATE social.posts SET echo_count = GREATEST(echo_count - 1, 0) WHERE id = NEW.referenced_post_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.kind = 'echo' AND OLD.referenced_post_id IS NOT NULL AND OLD.deleted_at IS NULL THEN
      UPDATE social.posts SET echo_count = GREATEST(echo_count - 1, 0) WHERE id = OLD.referenced_post_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_echo_count ON social.posts;
CREATE TRIGGER trg_echo_count
  AFTER INSERT OR UPDATE OR DELETE ON social.posts
  FOR EACH ROW EXECUTE FUNCTION social.sync_echo_count();

-- Backfill idempotente (hoy 0 ecos; re-aplicable sin daño).
UPDATE social.posts p SET echo_count = (
  SELECT count(*) FROM social.posts e
  WHERE e.referenced_post_id = p.id AND e.kind = 'echo' AND e.deleted_at IS NULL
);

-- La campana aprende a anunciar ecos.
ALTER TABLE social.notifications DROP CONSTRAINT notifications_kind_check;
ALTER TABLE social.notifications
  ADD CONSTRAINT notifications_kind_check CHECK (
    kind IN ('follow', 'reaction', 'comment', 'mention', 'follow_request', 'follow_accepted', 'echo')
  );
