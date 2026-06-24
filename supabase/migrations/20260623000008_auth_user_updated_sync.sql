-- ============================================================================
-- OSIA · Sync de verificación de email (auth.users UPDATE → identity.accounts)
--
-- El trigger de INSERT solo captura la confirmación si el email ya venía confirmado al crear el
-- usuario. La verificación REAL ocurre después (el residente hace clic en el link / code-input,
-- S1.5), lo que UPDATEa auth.users.email_confirmed_at. Este trigger sincroniza ese cambio:
-- setea accounts.email_verified_at y promueve la cuenta invited→active. También refleja cambios
-- de email. Ver docs/04 §13.6, backlog S1.5.
-- ============================================================================

CREATE OR REPLACE FUNCTION identity.handle_auth_user_updated()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = identity, public
AS $$
BEGIN
  UPDATE identity.accounts SET
    email = NEW.email,
    email_verified_at = CASE
      WHEN NEW.email_confirmed_at IS NOT NULL THEN COALESCE(email_verified_at, now())
      ELSE email_verified_at
    END,
    status = CASE
      WHEN NEW.email_confirmed_at IS NOT NULL AND status = 'invited' THEN 'active'
      ELSE status
    END
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auth_user_updated ON auth.users;
CREATE TRIGGER trg_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (
    OLD.email_confirmed_at IS DISTINCT FROM NEW.email_confirmed_at
    OR OLD.email IS DISTINCT FROM NEW.email
  )
  EXECUTE FUNCTION identity.handle_auth_user_updated();
