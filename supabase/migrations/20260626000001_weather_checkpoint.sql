-- ============================================================================
-- OSIA · S2-B4 · Checkpoint del clima (bounded context `world`)
-- Una fila por instancia: reanuda el clima (lluvia/niebla/…) tras un reinicio del
-- world-server en vez de volver a "despejado". El día/noche NO se persiste (es
-- determinista por tiempo). Lo escribe el world-server con conexión directa (pg),
-- nunca vía PostgREST → no necesita RLS (el esquema `world` no está expuesto).
-- Ver docs/backlog/fase-2-atmosfera-viva.md (S2-B4).
-- ============================================================================

CREATE TABLE world.weather_checkpoints (
  world_instance_id uuid PRIMARY KEY REFERENCES world.world_instances(id) ON DELETE CASCADE,
  seed              integer     NOT NULL,
  phase_until       bigint      NOT NULL,           -- epoch ms en que termina la fase actual
  active            boolean     NOT NULL DEFAULT false,
  weather           jsonb       NOT NULL,           -- { kind, intensity }
  day_index         bigint      NOT NULL DEFAULT 0, -- día de juego (presupuesto de eventos)
  events_today      integer     NOT NULL DEFAULT 0 CHECK (events_today >= 0),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
