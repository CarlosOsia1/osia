-- ============================================================================
-- OSIA · Pulido S3.5 · Reacción ÚNICA (estrella = "me gusta")
-- Decisión de Carlos (2026-07-01): luna/sol se descartan (no significaban nada y se acumulaban, una por
-- tipo). Se borran las reacciones no-estrella (el trigger de conteo ajusta `posts.reaction_count`) y se
-- estrecha el CHECK a solo 'star'. Espejo de REACTION_KIND_VALUES en @osia/shared. Forward-only.
-- ============================================================================

DELETE FROM social.reactions WHERE kind <> 'star';

ALTER TABLE social.reactions DROP CONSTRAINT reactions_kind_check;
ALTER TABLE social.reactions ADD CONSTRAINT reactions_kind_check CHECK (kind IN ('star'));
