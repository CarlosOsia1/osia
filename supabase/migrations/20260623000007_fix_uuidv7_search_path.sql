-- ============================================================================
-- OSIA · Fix · uuidv7() debe encontrar gen_random_bytes (pgcrypto) siempre.
--
-- En Supabase, pgcrypto vive en el schema `extensions` (no en `public`). El trigger
-- handle_new_auth_user corre con `search_path = identity, public`, así que cuando una columna
-- con DEFAULT public.uuidv7() se evalúa dentro del trigger, uuidv7() heredaba ese search_path
-- y `gen_random_bytes` quedaba fuera de alcance → "Database error creating new user".
--
-- Solución: uuidv7() lleva su PROPIO search_path (`public, extensions`), portable a Postgres
-- plano (pgcrypto en public) y a Supabase (pgcrypto en extensions).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.uuidv7()
RETURNS uuid AS $$
DECLARE
  unix_ts_ms bytea;
  uuid_bytes bytea;
BEGIN
  unix_ts_ms := substring(int8send((extract(epoch FROM clock_timestamp()) * 1000)::bigint) FROM 3);
  uuid_bytes := unix_ts_ms || gen_random_bytes(10);
  uuid_bytes := set_byte(uuid_bytes, 6, (b'0111' || get_byte(uuid_bytes, 6)::bit(4))::bit(8)::int);
  uuid_bytes := set_byte(uuid_bytes, 8, (b'10' || get_byte(uuid_bytes, 8)::bit(6))::bit(8)::int);
  RETURN encode(uuid_bytes, 'hex')::uuid;
END;
$$ LANGUAGE plpgsql VOLATILE SET search_path = public, extensions;
