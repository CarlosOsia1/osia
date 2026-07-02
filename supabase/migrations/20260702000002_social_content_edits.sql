-- ============================================================================
-- OSIA · Ola 3 · R4.1 · Editar post/comentario: `edited_at`
-- Señal EXPLÍCITA de edición, solo escrita por el use-case de editar. `posts.updated_at` NO
-- sirve: el trigger de contadores lo bumpea con cada reacción/comentario (trg_posts_updated),
-- así que no distingue "editado" de "reaccionado". `NULL` = nunca editado.
-- La visibilidad NO es editable (el fan-out del feed ya ocurrió al publicar).
-- Forward-only.
-- ============================================================================

ALTER TABLE social.posts    ADD COLUMN IF NOT EXISTS edited_at timestamptz;
ALTER TABLE social.comments ADD COLUMN IF NOT EXISTS edited_at timestamptz;
