-- ============================================================================
-- OSIA · S3.1-H3 · Esquema del Tejido Social (bounded context `social`)
-- follows · posts · reactions · comments · feed_items (HASH x8) · notifications
-- PK uuid v7, timestamptz UTC, soft-delete donde aplica, trigger set_updated_at.
-- Enums = espejo de @osia/shared domain/enums.ts (S3.1-H4). Ver docs/04 §7 y §13.
-- IA en Habitantes descartada al 100% (CLAUDE.md): sin author_kind, sin gossip.
-- Forward-only — nunca editar una migración aplicada.
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS social;

-- ============================ follows ============================
-- Grafo dirigido account->account. Dejar de seguir = borrar la fila (la fuente de verdad del
-- grafo es la presencia de la arista; `status` queda para bloqueo futuro). Sin soft-delete:
-- el ER no define `deleted_at` aquí (docs/04 §7.1).
CREATE TABLE social.follows (
  id                  uuid PRIMARY KEY DEFAULT public.uuidv7(),
  follower_account_id uuid NOT NULL REFERENCES identity.accounts(id) ON DELETE CASCADE,
  followee_account_id uuid NOT NULL REFERENCES identity.accounts(id) ON DELETE CASCADE,
  status              text NOT NULL DEFAULT 'active' CHECK (status IN ('active','blocked')),
  created_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_follows_no_self CHECK (follower_account_id <> followee_account_id)
);
CREATE UNIQUE INDEX uq_follows_pair     ON social.follows (follower_account_id, followee_account_id);
CREATE INDEX        idx_follows_follower ON social.follows (follower_account_id);
CREATE INDEX        idx_follows_followee ON social.follows (followee_account_id);

-- ============================ posts ============================
-- `media` es un array jsonb de URLs (R2); el API nunca recibe el binario (URL prefirmada).
-- `reaction_count`/`comment_count` son cachés desnormalizados (los triggers de conteo llegan en
-- S3.3, donde se insertan reactions/comments). Aquí solo la estructura.
CREATE TABLE social.posts (
  id                uuid PRIMARY KEY DEFAULT public.uuidv7(),
  author_account_id uuid NOT NULL REFERENCES identity.accounts(id) ON DELETE CASCADE,
  kind              text NOT NULL DEFAULT 'text' CHECK (kind IN ('text','image','moment')),
  body              text CHECK (body IS NULL OR char_length(body) <= 2000),
  media             jsonb NOT NULL DEFAULT '[]'::jsonb,
  visibility        text NOT NULL DEFAULT 'public'
                      CHECK (visibility IN ('public','followers','private')),
  reaction_count    integer NOT NULL DEFAULT 0 CHECK (reaction_count >= 0),
  comment_count     integer NOT NULL DEFAULT 0 CHECK (comment_count >= 0),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  deleted_at        timestamptz,
  -- media debe ser un array de a lo sumo 4 URLs (espejo de POST_MEDIA_MAX en @osia/shared).
  CONSTRAINT ck_posts_media_array CHECK (jsonb_typeof(media) = 'array' AND jsonb_array_length(media) <= 4),
  -- un post necesita contenido: texto no-vacío O al menos un adjunto (espejo del refine de Zod).
  CONSTRAINT ck_posts_has_content
    CHECK (
      (body IS NOT NULL AND char_length(btrim(body)) > 0)
      OR (jsonb_typeof(media) = 'array' AND jsonb_array_length(media) > 0)
    )
);
CREATE INDEX idx_posts_author ON social.posts (author_account_id, created_at DESC) WHERE deleted_at IS NULL;

-- ============================ reactions ============================
-- Única por (post, account, kind): un residente puede dar como máximo una de cada tipo a un post.
-- Quitar reacción = borrar la fila (DELETE idempotente); sin soft-delete (docs/04 §7.1).
CREATE TABLE social.reactions (
  id         uuid PRIMARY KEY DEFAULT public.uuidv7(),
  post_id    uuid NOT NULL REFERENCES social.posts(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES identity.accounts(id) ON DELETE CASCADE,
  kind       text NOT NULL CHECK (kind IN ('star','moon','sun')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_reactions      ON social.reactions (post_id, account_id, kind);
CREATE INDEX        idx_reactions_post ON social.reactions (post_id);

-- ============================ comments ============================
-- Hilos vía `parent_comment_id` (self-FK). Soft-delete del propio comentario (docs/04 §7.1).
CREATE TABLE social.comments (
  id                uuid PRIMARY KEY DEFAULT public.uuidv7(),
  post_id           uuid NOT NULL REFERENCES social.posts(id) ON DELETE CASCADE,
  author_account_id uuid NOT NULL REFERENCES identity.accounts(id) ON DELETE CASCADE,
  parent_comment_id uuid REFERENCES social.comments(id) ON DELETE CASCADE,
  body              text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 1000),
  created_at        timestamptz NOT NULL DEFAULT now(),
  deleted_at        timestamptz
);
CREATE INDEX idx_comments_post   ON social.comments (post_id, created_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_comments_parent ON social.comments (parent_comment_id) WHERE parent_comment_id IS NOT NULL;

-- ============================ feed_items (HASH x8) ============================
-- Feed materializado por fan-out-on-write, particionado por HASH(account_id) en 8 (docs/04 §7.3).
-- La PK incluye la clave de partición (account_id). Overkill funcional con 2-3 usuarios pero gratis
-- de definir ahora y caro de retrofittear. La poda por retención (cron) llega en S3.3-H4.
CREATE TABLE social.feed_items (
  id         uuid NOT NULL DEFAULT public.uuidv7(),
  account_id uuid NOT NULL REFERENCES identity.accounts(id) ON DELETE CASCADE,
  post_id    uuid NOT NULL REFERENCES social.posts(id) ON DELETE CASCADE,
  reason     text NOT NULL CHECK (reason IN ('follow','trending','event')),
  score      real NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (account_id, id)
) PARTITION BY HASH (account_id);

CREATE TABLE social.feed_items_p0 PARTITION OF social.feed_items FOR VALUES WITH (MODULUS 8, REMAINDER 0);
CREATE TABLE social.feed_items_p1 PARTITION OF social.feed_items FOR VALUES WITH (MODULUS 8, REMAINDER 1);
CREATE TABLE social.feed_items_p2 PARTITION OF social.feed_items FOR VALUES WITH (MODULUS 8, REMAINDER 2);
CREATE TABLE social.feed_items_p3 PARTITION OF social.feed_items FOR VALUES WITH (MODULUS 8, REMAINDER 3);
CREATE TABLE social.feed_items_p4 PARTITION OF social.feed_items FOR VALUES WITH (MODULUS 8, REMAINDER 4);
CREATE TABLE social.feed_items_p5 PARTITION OF social.feed_items FOR VALUES WITH (MODULUS 8, REMAINDER 5);
CREATE TABLE social.feed_items_p6 PARTITION OF social.feed_items FOR VALUES WITH (MODULUS 8, REMAINDER 6);
CREATE TABLE social.feed_items_p7 PARTITION OF social.feed_items FOR VALUES WITH (MODULUS 8, REMAINDER 7);

-- Lectura del feed de un usuario: WHERE account_id=$1 ORDER BY score DESC, created_at DESC.
CREATE INDEX idx_feed_acct_score ON social.feed_items (account_id, score DESC, created_at DESC);

-- ============================ notifications ============================
-- `kind` SIN `gossip` (IA descartada). `actor` nullable (SET NULL): notificación de sistema o
-- actor borrado no rompe la notificación.
CREATE TABLE social.notifications (
  id               uuid PRIMARY KEY DEFAULT public.uuidv7(),
  account_id       uuid NOT NULL REFERENCES identity.accounts(id) ON DELETE CASCADE,
  kind             text NOT NULL CHECK (kind IN ('follow','reaction','comment','mention')),
  actor_account_id uuid REFERENCES identity.accounts(id) ON DELETE SET NULL,
  payload          jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at          timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_account ON social.notifications (account_id, created_at DESC);
CREATE INDEX idx_notifications_unread  ON social.notifications (account_id) WHERE read_at IS NULL;

-- ====================== triggers set_updated_at ======================
-- Solo `posts` tiene `updated_at` (las demás tablas sociales son append-only o sin mutación de campos
-- versionables; el cambio de estado se modela por columnas/borrado, no por updated_at).
CREATE TRIGGER trg_posts_updated BEFORE UPDATE ON social.posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
