-- ============================================================================
-- OSIA · Ola 3 · R5 · Mensajes directos (DM): conversación 1-a-1
-- Par CANÓNICO `(a < b)` con UNIQUE: una sola conversación por pareja, sin tabla de
-- participantes (YAGNI — los grupos serían tablas nuevas el día que existan). El estado de
-- lectura vive en la conversación (`a_last_read_at`/`b_last_read_at`): unread = mensajes del
-- otro posteriores a tu marca. Mensajes con soft-delete propio («mensaje retirado»).
-- Bloqueo (R4.4): iniciar y enviar re-verifican el par en el API (403 BLOCKED).
-- La voz P2P del Mundo NO pasa por aquí (cero retención); esto es texto persistente.
-- RLS deny-all + service_role, como todo el schema social. Forward-only.
-- ============================================================================

CREATE TABLE IF NOT EXISTS social.dm_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  a_account_id uuid NOT NULL REFERENCES identity.accounts(id) ON DELETE CASCADE,
  b_account_id uuid NOT NULL REFERENCES identity.accounts(id) ON DELETE CASCADE,
  last_message_at timestamptz,
  a_last_read_at timestamptz,
  b_last_read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_dm_pair_canonical CHECK (a_account_id < b_account_id),
  CONSTRAINT uq_dm_pair UNIQUE (a_account_id, b_account_id)
);

-- Bandeja de cada lado, ordenada por actividad.
CREATE INDEX IF NOT EXISTS idx_dm_conv_a ON social.dm_conversations (a_account_id, last_message_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_dm_conv_b ON social.dm_conversations (b_account_id, last_message_at DESC NULLS LAST);

CREATE TABLE IF NOT EXISTS social.dm_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES social.dm_conversations(id) ON DELETE CASCADE,
  sender_account_id uuid NOT NULL REFERENCES identity.accounts(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- Hilo keyset (más recientes primero) y unread por marca de lectura.
CREATE INDEX IF NOT EXISTS idx_dm_msgs_conv ON social.dm_messages (conversation_id, created_at DESC, id DESC);

ALTER TABLE social.dm_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE social.dm_messages ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON social.dm_conversations TO service_role;
GRANT SELECT, INSERT, UPDATE ON social.dm_messages TO service_role;
