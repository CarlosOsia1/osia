-- Ola 1D — Buckets de media de POST en PRIVADO.
--
-- ⚠️ NO auto-aplicada por Claude (dev == prod: una sola base Supabase). Flipear estos buckets a privado
-- hace que sus URLs «públicas» dejen de servir (403); solo el API con `signMediaUrls` (Ola 1D, ya en el
-- código) entrega URLs firmadas utilizables. Si se aplica ANTES de que corra el API nuevo, la media deja
-- de verse. APLICAR junto con el despliegue del API que firma (o cuando Carlos lo decida y pueda verificar
-- que la media se ve). El código de firma funciona igual sobre buckets públicos, así que desplegarlo es
-- inofensivo; esta migración es el interruptor que CIERRA la fuga (media de cuentas privadas/solo-
-- seguidores servida por URL pública adivinable).
--
-- El bucket `profile-media` (avatar/portada) se queda PÚBLICO a propósito: la cara pública del perfil
-- (foto + nombre) es visible incluso en cuentas privadas (como Instagram); lo privado es el CONTENIDO.

UPDATE storage.buckets SET public = false WHERE id IN ('post-media', 'post-video');
