-- ============================================================================
-- OSIA · S1.2-H1 · Bootstrap de la base
-- Extensiones + uuidv7() + set_updated_at(). Cimienta TODAS las tablas.
-- Forward-only, idempotente. Ver docs/04 §13.2 y backlog S1.2-H1.
-- ============================================================================

-- Extensiones (Fase 0-2): pgcrypto (gen_random_bytes), citext (email/handle
-- case-insensitive), vector (pgvector — memoria IA, se usa en Fase 2; se habilita
-- ya para no migrar extensiones después).
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS vector;

-- ---------------------------------------------------------------------------
-- uuidv7(): PK universal ordenable por tiempo (mejor localidad de índice que v4).
-- Función propia hasta que Supabase traiga uuidv7() nativo (PG18) — entonces se
-- cambia el DEFAULT por migración. Ver docs/04 §13.2.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.uuidv7()
RETURNS uuid AS $$
DECLARE
  unix_ts_ms bytea;
  uuid_bytes bytea;
BEGIN
  unix_ts_ms := substring(int8send((extract(epoch FROM clock_timestamp()) * 1000)::bigint) FROM 3);
  uuid_bytes := unix_ts_ms || gen_random_bytes(10);
  -- versión 7 (nibble alto del byte 6)
  uuid_bytes := set_byte(uuid_bytes, 6, (b'0111' || get_byte(uuid_bytes, 6)::bit(4))::bit(8)::int);
  -- variante RFC 4122 (dos bits altos del byte 8)
  uuid_bytes := set_byte(uuid_bytes, 8, (b'10' || get_byte(uuid_bytes, 8)::bit(6))::bit(8)::int);
  RETURN encode(uuid_bytes, 'hex')::uuid;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- ---------------------------------------------------------------------------
-- set_updated_at(): trigger reutilizable BEFORE UPDATE en toda entidad de dominio.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
