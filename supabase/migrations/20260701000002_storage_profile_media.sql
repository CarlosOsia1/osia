-- ============================================================================
-- OSIA · S3.8 · Bucket de Storage para foto y portada de perfil (`profile-media`)
-- Mismo patrón que `post-media` (S3.3-H1): el API nunca recibe el binario; el cliente sube DIRECTO por
-- URL PREFIRMADA que mintea apps/api con service_role. Bucket PÚBLICO de lectura (URLs uuid inadivinables);
-- la ESCRITURA solo por el token prefirmado, no por RLS de `authenticated`. Solo imágenes, <=5 MiB.
-- Forward-only.
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-media',
  'profile-media',
  true,
  5242880, -- 5 MiB (espejo de PROFILE_MEDIA_SIZE_MAX en @osia/shared)
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
  SET public             = EXCLUDED.public,
      file_size_limit    = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;
