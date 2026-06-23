-- ============================================================================
-- OSIA · S1.2-H3 · Sincronización con Supabase Auth
--
-- Cuando Supabase Auth crea un usuario (auth.users), creamos su pasaporte OSIA con el MISMO
-- id (auth.uid() == accounts.id → RLS simple): cuenta + perfil por defecto + avatar low-poly.
-- Idempotente (ON CONFLICT DO NOTHING). El handle definitivo lo elige el residente en
-- onboarding (S1.5); aquí se asigna uno PROVISIONAL válido y casi-único. Ver docs/04 §13.6.
-- ============================================================================

CREATE OR REPLACE FUNCTION identity.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = identity, public
AS $$
DECLARE
  v_hex       text := replace(NEW.id::text, '-', '');
  v_base      text := lower(split_part(NEW.email, '@', 1));
  v_sanitized text := regexp_replace(lower(split_part(NEW.email, '@', 1)), '[^a-z0-9_]', '_', 'g');
  v_handle    text;
  v_display   text;
BEGIN
  -- 1) cuenta OSIA con el MISMO id que el usuario de auth.
  INSERT INTO identity.accounts (id, email, status, email_verified_at)
  VALUES (
    NEW.id,
    NEW.email,
    'invited',
    CASE WHEN NEW.email_confirmed_at IS NOT NULL THEN now() ELSE NULL END
  )
  ON CONFLICT (id) DO NOTHING;

  -- handle provisional que cumple ^[a-z0-9_]{3,20}$ (sufijo del uuid = casi-único).
  IF v_sanitized = '' THEN v_sanitized := 'osia'; END IF;
  v_handle  := substr(v_sanitized, 1, 13) || '_' || right(v_hex, 6);
  v_display := left(COALESCE(NULLIF(v_base, ''), 'Residente'), 40);

  -- 2) perfil por defecto (accent champán por DEFAULT de la tabla = marca en el dato).
  --    Reintento ante la rarísima colisión de handle, para no abortar el signup.
  BEGIN
    INSERT INTO identity.profiles (account_id, handle, display_name)
    VALUES (NEW.id, v_handle, v_display)
    ON CONFLICT (account_id) DO NOTHING;
  EXCEPTION WHEN unique_violation THEN
    INSERT INTO identity.profiles (account_id, handle, display_name)
    VALUES (NEW.id, substr(v_sanitized, 1, 6) || '_' || right(v_hex, 12), v_display)
    ON CONFLICT (account_id) DO NOTHING;
  END;

  -- 3) avatar low-poly por defecto, activo.
  INSERT INTO identity.avatars (account_id, kind, is_active)
  VALUES (NEW.id, 'lowpoly', true)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

-- El trigger vive sobre auth.users (tabla de Supabase Auth).
DROP TRIGGER IF EXISTS trg_auth_user_created ON auth.users;
CREATE TRIGGER trg_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION identity.handle_new_auth_user();
