-- OSIA-S1.6-H3 — Preferencias del residente.
-- Sonido on/off + volumen, override de movimiento reducido y opt-in de micrófono (voz P2P).
-- jsonb con default {}; el backend mezcla los defaults de marca al leer (PROFILE_PREFS_DEFAULT),
-- de modo que claves ausentes caen al default sin migración de datos.
ALTER TABLE identity.profiles
  ADD COLUMN IF NOT EXISTS prefs jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN identity.profiles.prefs IS
  'Preferencias del residente (S1.6-H3): { sound, volume, reducedMotion, micOptIn }. Defaults en @osia/shared.';
