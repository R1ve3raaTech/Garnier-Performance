-- ─────────────────────────────────────────────────────────────────────────────
-- Migración v6 — Tabla de encuestas eNPS
-- Ejecutar en MySQL Workbench antes de reiniciar el servidor
-- ─────────────────────────────────────────────────────────────────────────────

USE tallerrhh;

CREATE TABLE IF NOT EXISTS surveys (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title       VARCHAR(255) NOT NULL,
  description TEXT         NULL,
  period      VARCHAR(50)  NULL    COMMENT 'Ej: Q1-2026, Semestral-2026',
  status      ENUM('draft','active','closed') NOT NULL DEFAULT 'draft',
  start_date  DATE         NULL,
  end_date    DATE         NULL,
  created_by  INT UNSIGNED NOT NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id),
  INDEX idx_status (status)
) ENGINE=InnoDB;

-- Encuesta activa de ejemplo para desarrollo
INSERT INTO surveys (title, description, period, status, start_date, end_date, created_by)
SELECT 'Encuesta eNPS Q2-2026',
       'Encuesta semestral de clima y recomendación de Garnier como lugar de trabajo',
       'Q2-2026',
       'active',
       '2026-05-01',
       '2026-06-30',
       id
FROM   users
WHERE  email = 'rh@garnier.com'
LIMIT  1;
