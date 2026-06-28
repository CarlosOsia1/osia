-- ============================================================================
-- OSIA · S3.3-H1 · Bucket de Storage para adjuntos de Post (`post-media`)
--
-- El API nunca recibe el binario: el cliente sube DIRECTO a Storage por una URL PREFIRMADA que
-- mintea `apps/api` con service_role (docs/09, backlog S3.3-H1). El bucket es PÚBLICO de lectura
-- (las URLs son uuids inadivinables y el feed es de prestigio curado, no privado); la ESCRITURA solo
-- ocurre por el token de la URL prefirmada, no por RLS de `authenticated`. Solo imágenes, <=10 MiB.
-- Forward-only. El `config.toml [storage.buckets]` solo aplica a local; en cloud se crea aquí.
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'post-media',
  'post-media',
  true,
  10485760, -- 10 MiB (espejo de POST_MEDIA_SIZE_MAX en @osia/shared)
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE
  SET public            = EXCLUDED.public,
      file_size_limit   = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;
