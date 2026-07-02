-- ============================================================================
-- OSIA · Ola 1 · Quitar índice muerto social.idx_feed_acct_score
-- El feed se lee SIEMPRE por recencia (created_at DESC, servido por idx_feed_acct_recency); `score`
-- se selecciona para el DTO pero nunca entra en ORDER BY/WHERE. Este índice solo añadía amplificación
-- de escritura en CADA fila del fan-out (una escritura de índice por seguidor por post) sin ningún
-- lector. Forward-only; la columna `score` se conserva (barata y ya en el DTO).
-- ============================================================================

DROP INDEX IF EXISTS social.idx_feed_acct_score;
