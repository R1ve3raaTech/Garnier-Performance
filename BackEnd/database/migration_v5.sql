-- ─────────────────────────────────────────────────────────────────────────────
-- Migración v5 — Detección de crisis emocional en PulseWork
-- Ejecutar en MySQL Workbench antes de reiniciar el servidor
-- ─────────────────────────────────────────────────────────────────────────────

USE tallerrhh;

ALTER TABLE pulse_entries
  ADD COLUMN ai_crisis_flag TINYINT(1) NOT NULL DEFAULT 0
    COMMENT '1 = señal de crisis detectada por IA (estrés severo, ansiedad, depresión)'
    AFTER ai_keywords;
