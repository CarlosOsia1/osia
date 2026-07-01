-- ============================================================================
-- OSIA · S3.9 · Nuevos tipos de notificación para solicitudes de seguimiento
-- `follow_request` (te solicitaron seguir tu cuenta privada) y `follow_accepted` (aceptaron tu
-- solicitud). Espejo de NOTIFICATION_TYPE_VALUES en @osia/shared. Forward-only.
-- ============================================================================

ALTER TABLE social.notifications DROP CONSTRAINT notifications_kind_check;
ALTER TABLE social.notifications
  ADD CONSTRAINT notifications_kind_check
  CHECK (kind IN ('follow', 'reaction', 'comment', 'mention', 'follow_request', 'follow_accepted'));
