-- ============================================================================
-- OSIA · S3.8 · Tarjeta social del perfil (`social.profile_cards`)
-- Social es dueño de su PRESENTACIÓN y su PRIVACIDAD (identity.profiles queda intacto: handle,
-- displayName, bio, avatar low-poly y los cachés derivados). Aquí: privacidad de cuenta + foto y
-- portada REALES (subidas por URL prefirmada al bucket `profile-media`). La ausencia de fila = perfil
-- público sin foto/portada (LEFT JOIN + COALESCE en la query); la fila se crea al primer edit (upsert).
-- RLS deny-all: lectura/escritura solo por apps/api (service_role). Forward-only.
-- ============================================================================

CREATE TABLE social.profile_cards (
  account_id uuid PRIMARY KEY REFERENCES identity.accounts(id) ON DELETE CASCADE,
  is_private boolean NOT NULL DEFAULT false,
  photo_url  text,
  cover_url  text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_profile_cards_updated BEFORE UPDATE ON social.profile_cards
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

GRANT ALL ON social.profile_cards TO service_role;
-- RLS deny-all: ningún grant a `authenticated`; todo entra por apps/api (service_role).
ALTER TABLE social.profile_cards ENABLE ROW LEVEL SECURITY;
