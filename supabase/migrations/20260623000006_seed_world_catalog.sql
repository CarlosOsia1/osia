-- ============================================================================
-- OSIA · S1.2-H2 · Seed de catálogo de mundo (idempotente, forward-only)
--
-- Va como MIGRACIÓN (no supabase/seed.sql) porque es catálogo que debe existir también en
-- prod: El Mundo necesita "a dónde llegar". 1 world (OSIA) · 1 zone hub (El Claro) · 1
-- world_instance hub abierta. Re-aplicar no duplica.
-- ============================================================================

-- 1) El Mundo (live).
INSERT INTO world.worlds (slug, name, status)
VALUES ('osia', 'OSIA', 'live')
ON CONFLICT (slug) DO NOTHING;

-- 2) Zona hub "El Claro".
INSERT INTO world.zones (world_id, slug, name, kind, capacity)
SELECT w.id, 'hub', 'El Claro', 'hub', 50
FROM world.worlds w
WHERE w.slug = 'osia'
ON CONFLICT (world_id, slug) DO NOTHING;

-- 3) Instancia hub por defecto (solo si la zona hub aún no tiene la instancia 'default').
INSERT INTO world.world_instances (zone_id, shard_key, status)
SELECT z.id, 'default', 'open'
FROM world.zones z
JOIN world.worlds w ON w.id = z.world_id
WHERE w.slug = 'osia'
  AND z.slug = 'hub'
  AND NOT EXISTS (
    SELECT 1 FROM world.world_instances wi
    WHERE wi.zone_id = z.id AND wi.shard_key = 'default'
  );
