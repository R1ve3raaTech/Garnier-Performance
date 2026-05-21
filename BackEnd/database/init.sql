-- ─────────────────────────────────────────────────────────────────────────────
-- Ecosistema Digital RRHH Garnier — Schema inicial
-- ─────────────────────────────────────────────────────────────────────────────

CREATE DATABASE IF NOT EXISTS tallerrhh CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE tallerrhh;

-- ── PROYECTO 02: PulseWork ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pulse_entries (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  area_id          INT UNSIGNED    NOT NULL,
  emotion_score    TINYINT UNSIGNED NOT NULL COMMENT '1-5',
  influence_factors JSON            NOT NULL DEFAULT (JSON_ARRAY()),
  open_comment     TEXT            NULL,
  created_at       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  -- userId intencionalmente ausente: anonimato por diseño
  INDEX idx_area_created (area_id, created_at)
) ENGINE=InnoDB;

-- ── PROYECTO 03: eNPS ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS enps_responses (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  survey_id        INT UNSIGNED    NOT NULL,
  area_id          INT UNSIGNED    NOT NULL,
  position         VARCHAR(100)    NULL,
  seniority_years  TINYINT UNSIGNED NULL,
  enps_score       TINYINT UNSIGNED NOT NULL COMMENT '0-10',
  likert_scores    JSON            NOT NULL DEFAULT (JSON_OBJECT()),
  valued_comment   TEXT            NULL,
  created_at       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_survey_area (survey_id, area_id)
) ENGINE=InnoDB;
