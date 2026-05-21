-- ─────────────────────────────────────────────────────────────────────────────
-- Migración v4 — Columnas de análisis IA en PulseWork y eNPS
-- Ejecutar en MySQL Workbench antes de reiniciar el servidor
-- ─────────────────────────────────────────────────────────────────────────────

USE tallerrhh;

-- ── PulseWork: resultado del análisis IA del comentario libre ─────────────────
ALTER TABLE pulse_entries
  ADD COLUMN ai_sentiment VARCHAR(20)  NULL COMMENT 'POSITIVO|NEUTRO|NEGATIVO'  AFTER open_comment,
  ADD COLUMN ai_keywords  JSON         NULL COMMENT 'Palabras clave extraídas'  AFTER ai_sentiment;

-- ── eNPS: categorización automática de comentarios abiertos ──────────────────
ALTER TABLE enps_responses
  ADD COLUMN ai_valued_category      VARCHAR(100) NULL COMMENT 'Categoría IA del comentario positivo'  AFTER valued_comment,
  ADD COLUMN ai_improvement_category VARCHAR(100) NULL COMMENT 'Categoría IA del comentario de mejora' AFTER improvement_comment;
