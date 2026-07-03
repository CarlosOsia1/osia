-- Ola 1C — Outbox transaccional del Tejido Social.
--
-- Problema que resuelve: hoy los casos de uso escriben en la DB y LUEGO emiten el evento de dominio al
-- bus in-process (fire-and-forget). Si el proceso muere entre el commit del write y la entrega del
-- evento, el evento se PIERDE: el fan-out no materializa el post en los feeds de los seguidores, la
-- reputación no se acredita, la notificación no llega. El más grave es el fan-out: un post publicado que
-- pierde su `social.post.published` queda invisible para tus seguidores para siempre.
--
-- Patrón outbox: el evento se INSERTA en esta tabla dentro de la MISMA transacción que el write de
-- dominio (atómico: o se guardan ambos o ninguno). Un dispatcher lee los no-publicados y los entrega al
-- bus (at-least-once); los consumidores son idempotentes, así que un reintento tras un crash es inocuo.

create table if not exists social.outbox (
  id           uuid primary key default gen_random_uuid(),
  topic        text not null,                         -- nombre del evento de dominio (social.*)
  payload      jsonb not null,                        -- el payload tipado, serializado
  created_at   timestamptz not null default now(),
  published_at timestamptz,                           -- null = pendiente de entregar
  attempts     integer not null default 0,            -- intentos de entrega (claim incrementa; cap = dead-letter)
  last_error   text                                   -- último error de entrega (diagnóstico); null si ok
);

-- El dispatcher solo mira los pendientes; índice parcial mínimo (orden de llegada) para su poll.
create index if not exists idx_outbox_unpublished
  on social.outbox (created_at)
  where published_at is null;
