-- ============================================================================
-- OSIA · S3.10 · Video en posts + media tipada ({url, kind})
-- - Bucket público `post-video` (≤50 MiB, mp4/webm) para subida prefirmada (sin transcodificar).
-- - `posts.kind` += 'video'.
-- - `posts.media` pasa de un array de URLs string a un array de objetos {url, kind}. Se migran las
--   filas viejas (elementos string) a {url, kind:'image'}; idempotente (solo toca las que aún son
--   string). El CHECK de longitud (`ck_posts_media_array`) sigue válido (es sobre el array). La
--   validación por-elemento vive en Zod/@osia/shared (el schema social no se expone por PostgREST).
-- Forward-only.
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'post-video',
  'post-video',
  true,
  52428800, -- 50 MiB (espejo de POST_VIDEO_SIZE_MAX en @osia/shared)
  ARRAY['video/mp4', 'video/webm']
)
ON CONFLICT (id) DO UPDATE
  SET public             = EXCLUDED.public,
      file_size_limit    = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

ALTER TABLE social.posts DROP CONSTRAINT posts_kind_check;
ALTER TABLE social.posts
  ADD CONSTRAINT posts_kind_check CHECK (kind IN ('text', 'image', 'video', 'moment'));

UPDATE social.posts
   SET media = (
     SELECT jsonb_agg(jsonb_build_object('url', elem, 'kind', 'image'))
     FROM jsonb_array_elements_text(media) elem
   )
 WHERE jsonb_array_length(media) > 0
   AND jsonb_typeof(media -> 0) = 'string';
