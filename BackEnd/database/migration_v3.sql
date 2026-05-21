-- ─────────────────────────────────────────────────────────────────────────────
-- Migración v3 — Tabla de consultas no resueltas (Escalación HR Assistant)
-- Ejecutar en MySQL Workbench sobre la BD tallerrhh
-- ─────────────────────────────────────────────────────────────────────────────

USE tallerrhh;

CREATE TABLE IF NOT EXISTS unresolved_queries (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id      INT UNSIGNED NOT NULL,
  question     TEXT         NOT NULL,
  status       ENUM('pending', 'in_review', 'resolved') NOT NULL DEFAULT 'pending',
  resolved_by  INT UNSIGNED NULL COMMENT 'FK al user de RH que lo resolvió',
  resolved_at  DATETIME     NULL,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)     REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_status_created (status, created_at)
) ENGINE=InnoDB COMMENT='Consultas sin respuesta en la KB — requieren seguimiento por RH';
