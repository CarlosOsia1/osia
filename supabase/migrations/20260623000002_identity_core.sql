-- ============================================================================
-- OSIA · S1.2-H2 · Esquema de identidad (bounded context `identity`)
-- accounts · profiles · avatars · email_verifications · invitations · waitlist_entries
-- PK uuid v7, timestamptz UTC, soft-delete donde aplica, trigger set_updated_at.
-- Enums = espejo de domain/enums.ts (@osia/shared). Ver docs/04 §3 y §13.3.
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS identity;

-- ============================ accounts ============================
CREATE TABLE identity.accounts (
  id                    uuid PRIMARY KEY DEFAULT public.uuidv7(),
  email                 citext NOT NULL,
  -- null por defecto: la verificación/sesión las maneja Supabase Auth (docs/04 §3.2).
  password_hash         text,
  status                text NOT NULL DEFAULT 'invited'
                          CHECK (status IN ('invited','active','suspended')),
  role                  text NOT NULL DEFAULT 'member'
                          CHECK (role IN ('member','admin')),
  invited_by_account_id uuid REFERENCES identity.accounts(id) ON DELETE SET NULL,
  email_verified_at     timestamptz,
  last_seen_at          timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  deleted_at            timestamptz
);
CREATE UNIQUE INDEX uq_accounts_email      ON identity.accounts (email) WHERE deleted_at IS NULL;
CREATE INDEX        idx_accounts_status     ON identity.accounts (status) WHERE deleted_at IS NULL;
CREATE INDEX        idx_accounts_invited_by ON identity.accounts (invited_by_account_id);
CREATE INDEX        idx_accounts_last_seen  ON identity.accounts (last_seen_at DESC);

-- ============================ profiles ============================
CREATE TABLE identity.profiles (
  id                uuid PRIMARY KEY DEFAULT public.uuidv7(),
  account_id        uuid NOT NULL UNIQUE
                      REFERENCES identity.accounts(id) ON DELETE CASCADE,
  handle            citext NOT NULL,
  display_name      text NOT NULL CHECK (char_length(display_name) <= 40),
  bio               text CHECK (char_length(bio) <= 280),
  avatar_url        text,
  accent_color      text NOT NULL DEFAULT '#CBB89A'
                      CHECK (accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  popularity_points integer NOT NULL DEFAULT 0 CHECK (popularity_points >= 0),
  reputation        integer NOT NULL DEFAULT 0,
  privacy           jsonb NOT NULL
                      DEFAULT '{"profile":"members","presence":"followers"}'::jsonb,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  deleted_at        timestamptz,
  CONSTRAINT ck_profiles_handle CHECK (handle ~ '^[a-z0-9_]{3,20}$')
);
CREATE UNIQUE INDEX uq_profiles_handle      ON identity.profiles (handle) WHERE deleted_at IS NULL;
CREATE INDEX        idx_profiles_popularity ON identity.profiles (popularity_points DESC);

-- ============================ avatars ============================
CREATE TABLE identity.avatars (
  id          uuid PRIMARY KEY DEFAULT public.uuidv7(),
  account_id  uuid NOT NULL REFERENCES identity.accounts(id) ON DELETE CASCADE,
  kind        text NOT NULL DEFAULT 'lowpoly' CHECK (kind IN ('lowpoly','rpm')),
  config      jsonb NOT NULL DEFAULT '{}'::jsonb,
  gltf_url    text,
  is_active   boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_avatars_account ON identity.avatars (account_id);
-- Un único avatar activo por cuenta (la "apariencia vigente"). Permite varios guardados.
CREATE UNIQUE INDEX uq_avatars_active ON identity.avatars (account_id) WHERE is_active;

-- ====================== email_verifications ======================
CREATE TABLE identity.email_verifications (
  id          uuid PRIMARY KEY DEFAULT public.uuidv7(),
  account_id  uuid NOT NULL REFERENCES identity.accounts(id) ON DELETE CASCADE,
  token_hash  text NOT NULL,
  purpose     text NOT NULL DEFAULT 'signup' CHECK (purpose IN ('signup','email_change')),
  expires_at  timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_email_verifications_token ON identity.email_verifications (token_hash);
CREATE INDEX idx_email_verifications_account     ON identity.email_verifications (account_id);

-- ============================ invitations ============================
CREATE TABLE identity.invitations (
  id                    uuid PRIMARY KEY DEFAULT public.uuidv7(),
  -- nullable + SET NULL: promociones de waitlist por automatismo de FOMO pueden no tener
  -- un invitador persona; borrar al invitador no borra la invitación.
  inviter_account_id    uuid REFERENCES identity.accounts(id) ON DELETE SET NULL,
  invited_email         citext,
  code                  text NOT NULL,
  status                text NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending','accepted','revoked','expired')),
  accepted_by_account_id uuid REFERENCES identity.accounts(id) ON DELETE SET NULL,
  expires_at            timestamptz,
  accepted_at           timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_invitations_code     ON identity.invitations (code);
CREATE INDEX        idx_invitations_inviter ON identity.invitations (inviter_account_id);
-- Para el cron que expira invitaciones pendientes (docs/04 §3.4).
CREATE INDEX        idx_invitations_pending ON identity.invitations (expires_at) WHERE status = 'pending';

-- ========================= waitlist_entries =========================
CREATE TABLE identity.waitlist_entries (
  id                     uuid PRIMARY KEY DEFAULT public.uuidv7(),
  email                  citext NOT NULL,
  source                 text,
  status                 text NOT NULL DEFAULT 'queued'
                           CHECK (status IN ('queued','invited','joined','rejected')),
  promoted_invitation_id uuid REFERENCES identity.invitations(id) ON DELETE SET NULL,
  meta                   jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_waitlist_email  ON identity.waitlist_entries (email);
CREATE INDEX        idx_waitlist_status ON identity.waitlist_entries (status);

-- ====================== triggers set_updated_at ======================
CREATE TRIGGER trg_accounts_updated BEFORE UPDATE ON identity.accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON identity.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_avatars_updated BEFORE UPDATE ON identity.avatars
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_invitations_updated BEFORE UPDATE ON identity.invitations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_waitlist_updated BEFORE UPDATE ON identity.waitlist_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
