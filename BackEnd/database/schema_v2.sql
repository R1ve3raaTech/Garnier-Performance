-- ─────────────────────────────────────────────────────────────────────────────
-- Ecosistema Digital RRHH Garnier — Schema v2 (Fase 2: Auth + Roles)
-- Ejecutar completo en MySQL Workbench antes de levantar el servidor
-- ─────────────────────────────────────────────────────────────────────────────

CREATE DATABASE IF NOT EXISTS tallerrhh
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE tallerrhh;

-- ── Limpiar tablas si existen (orden correcto por FKs) ───────────────────────
DROP TABLE IF EXISTS goals;
DROP TABLE IF EXISTS enps_responses;
DROP TABLE IF EXISTS pulse_entries;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS areas;
DROP TABLE IF EXISTS roles;

-- ── Catálogos ────────────────────────────────────────────────────────────────
CREATE TABLE roles (
  id   TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE areas (
  id   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE
);

-- ── Usuarios ─────────────────────────────────────────────────────────────────
CREATE TABLE users (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(150) NOT NULL,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role_id       TINYINT UNSIGNED NOT NULL,
  area_id       INT UNSIGNED     NOT NULL,
  position      VARCHAR(100)     NULL,
  hire_date     DATE             NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES roles(id),
  FOREIGN KEY (area_id) REFERENCES areas(id)
);

-- ── Proyecto 02: PulseWork ───────────────────────────────────────────────────
-- user_id ausente intencionalmente: anonimato por diseño
CREATE TABLE pulse_entries (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  area_id           INT UNSIGNED     NOT NULL,
  emotion_score     TINYINT UNSIGNED NOT NULL COMMENT '1-5',
  influence_factors JSON             NOT NULL DEFAULT (JSON_ARRAY()),
  open_comment      TEXT             NULL,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_area_created (area_id, created_at)
) ENGINE=InnoDB;

-- ── Proyecto 03: eNPS ────────────────────────────────────────────────────────
-- Sin FK a users: datos demográficos anónimos
CREATE TABLE enps_responses (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  survey_id           INT UNSIGNED     NOT NULL,
  area_id             INT UNSIGNED     NOT NULL,
  position            VARCHAR(100)     NULL,
  seniority_years     TINYINT UNSIGNED NULL,
  enps_score          TINYINT UNSIGNED NOT NULL COMMENT '0-10',
  likert_scores       JSON             NOT NULL DEFAULT (JSON_OBJECT()),
  valued_comment      TEXT             NULL,
  improvement_comment TEXT             NULL,
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_survey_area (survey_id, area_id)
) ENGINE=InnoDB;

-- ── Proyecto 04: Performance ─────────────────────────────────────────────────
CREATE TABLE goals (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id       INT UNSIGNED NOT NULL,
  type          ENUM('OKR','KPI') NOT NULL,
  title         VARCHAR(255) NOT NULL,
  description   TEXT NULL,
  target_value  DECIMAL(10,2) NULL,
  current_value DECIMAL(10,2) NULL,
  unit          VARCHAR(50)   NULL,
  due_date      DATE          NULL,
  status        ENUM('PENDIENTE','EN_PROGRESO','COMPLETADO','CANCELADO') NOT NULL DEFAULT 'PENDIENTE',
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_status (user_id, status)
) ENGINE=InnoDB;

-- ── Seed: Catálogos ──────────────────────────────────────────────────────────
INSERT INTO roles (name) VALUES ('Funcionario'), ('Jefatura'), ('RH'), ('Admin');

INSERT INTO areas (name) VALUES
  ('Tecnología'),
  ('Recursos Humanos'),
  ('Ventas'),
  ('Operaciones');

-- ── IMPORTANTE ───────────────────────────────────────────────────────────────
-- Los usuarios de prueba se crean ejecutando:
--   node database/seed.js
-- (necesita el servidor Node y el pool activo para hacer el hash de bcrypt)
