-- ============================================================================
-- OSIA · S1.2-H2 · World mínimo (bounded context `world`)
-- worlds · zones · world_instances · presence_sessions
-- Lo mínimo para que El Mundo tenga "a dónde llegar". portals/plots = Fase 5 (no aquí).
-- world_instances/presence_sessions son la proyección DURABLE del world-server (no el
-- estado de tick, eso es Redis). Ver docs/04 §4.
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS world;

-- ============================ worlds ============================
CREATE TABLE world.worlds (
  id         uuid PRIMARY KEY DEFAULT public.uuidv7(),
  slug       text NOT NULL,
  name       text NOT NULL,
  status     text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','live','archived')),
  config     jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_worlds_slug ON world.worlds (slug);

-- ============================ zones ============================
CREATE TABLE world.zones (
  id                uuid PRIMARY KEY DEFAULT public.uuidv7(),
  world_id          uuid NOT NULL REFERENCES world.worlds(id) ON DELETE CASCADE,
  slug              text NOT NULL,
  name              text NOT NULL,
  kind              text NOT NULL CHECK (kind IN ('hub','social','contemplative','plotfield')),
  capacity          integer NOT NULL DEFAULT 50 CHECK (capacity > 0),
  scene_manifest_id text,
  spawn_points      jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at        timestamptz NOT NULL DEFAULT now()
);
-- slug único POR mundo (no global): permite 'hub' en cada mundo futuro.
CREATE UNIQUE INDEX uq_zones_world_slug ON world.zones (world_id, slug);
CREATE INDEX        idx_zones_world      ON world.zones (world_id);

-- ======================== world_instances ========================
CREATE TABLE world.world_instances (
  id           uuid PRIMARY KEY DEFAULT public.uuidv7(),
  zone_id      uuid NOT NULL REFERENCES world.zones(id) ON DELETE CASCADE,
  shard_key    text,
  status       text NOT NULL DEFAULT 'open' CHECK (status IN ('open','full','draining','closed')),
  player_count integer NOT NULL DEFAULT 0 CHECK (player_count >= 0),
  server_node  text,
  opened_at    timestamptz NOT NULL DEFAULT now(),
  closed_at    timestamptz
);
CREATE INDEX idx_world_instances_zone ON world.world_instances (zone_id);
CREATE INDEX idx_world_instances_open ON world.world_instances (status) WHERE status = 'open';

-- ======================== presence_sessions ========================
-- Una fila por conexión (apertura/cierre). La presencia EN VIVO está en Redis con TTL;
-- aquí solo el histórico durable ("estuviste 3h", "quién estuvo conmigo").
CREATE TABLE world.presence_sessions (
  id                uuid PRIMARY KEY DEFAULT public.uuidv7(),
  account_id        uuid NOT NULL REFERENCES identity.accounts(id) ON DELETE CASCADE,
  world_instance_id uuid NOT NULL REFERENCES world.world_instances(id) ON DELETE CASCADE,
  connection_id     text,
  joined_at         timestamptz NOT NULL DEFAULT now(),
  left_at           timestamptz
);
CREATE INDEX idx_presence_account  ON world.presence_sessions (account_id);
CREATE INDEX idx_presence_instance ON world.presence_sessions (world_instance_id);
-- Sesiones abiertas (sin left_at): "quién sigue dentro".
CREATE INDEX idx_presence_open     ON world.presence_sessions (world_instance_id) WHERE left_at IS NULL;
