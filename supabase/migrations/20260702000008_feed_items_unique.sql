-- Ola 1C — idempotencia del fan-out del feed.
--
-- El outbox entrega at-least-once: si el dispatcher entrega `social.post.published` y falla al marcarlo
-- publicado, lo reintenta y el fan-out corre de nuevo. Hoy `fanOutPost` hace INSERT sin dedup y la PK de
-- `feed_items` es (account_id, id) con `id` uuidv7 nuevo por fila → una re-entrega DUPLICA el post en el
-- feed. La solución de fondo: un único (account_id, post_id) para poder `ON CONFLICT DO NOTHING`. Un post
-- no debe aparecer dos veces en tu feed (sea cual sea la razón), así que el único es además correcto.

-- 1) Deduplica cualquier fila repetida preexistente (conserva la más antigua por id uuidv7 time-ordered).
DELETE FROM social.feed_items a
USING social.feed_items b
WHERE a.account_id = b.account_id
  AND a.post_id = b.post_id
  AND a.id > b.id;

-- 2) Único (incluye la clave de partición account_id, requisito de las tablas particionadas).
ALTER TABLE social.feed_items
  ADD CONSTRAINT uq_feed_acct_post UNIQUE (account_id, post_id);
