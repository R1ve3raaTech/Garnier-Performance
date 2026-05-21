-- ─────────────────────────────────────────────────────────────────────────────
-- Migración v8 — Reconocimientos, Feedback, Registro de Reuniones 1:1 y MCI
-- ─────────────────────────────────────────────────────────────────────────────

USE tallerrhh;

-- 1. Agregar tipo MCI a metas
ALTER TABLE goals MODIFY COLUMN type ENUM('OKR','KPI','MCI') NOT NULL;

-- 2. Reconocimientos
CREATE TABLE IF NOT EXISTS recognitions (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  from_user_id  INT UNSIGNED NOT NULL,
  to_user_id    INT UNSIGNED NOT NULL,
  title         VARCHAR(255) NOT NULL,
  message       TEXT         NOT NULL,
  category      ENUM('logro','colaboracion','innovacion','liderazgo','servicio','actitud') NOT NULL,
  is_public     TINYINT(1)   NOT NULL DEFAULT 1,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (to_user_id)   REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_to_user  (to_user_id, created_at),
  INDEX idx_from_user(from_user_id, created_at)
) ENGINE=InnoDB;

-- 3. Feedback bidireccional
CREATE TABLE IF NOT EXISTS feedbacks (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  from_user_id  INT UNSIGNED NOT NULL,
  to_user_id    INT UNSIGNED NOT NULL,
  type          ENUM('leader_to_collab','collab_to_leader','peer') NOT NULL,
  period        VARCHAR(50)  NULL    COMMENT 'Ej: S1-2026',
  scores        JSON         NOT NULL DEFAULT (JSON_OBJECT()) COMMENT 'Competencias 1-5',
  comment       TEXT         NULL,
  is_anonymous  TINYINT(1)   NOT NULL DEFAULT 0,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (to_user_id)   REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_to_user(to_user_id, created_at)
) ENGINE=InnoDB;

-- 4. Registro de reuniones 1:1
CREATE TABLE IF NOT EXISTS meeting_records (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  leader_id           INT UNSIGNED NOT NULL,
  employee_id         INT UNSIGNED NOT NULL,
  meeting_date        DATE         NOT NULL,
  commitments         JSON         NULL COMMENT 'Array de compromisos acordados',
  leader_feedback     JSON         NULL COMMENT 'scores por competencia + comentario',
  employee_feedback   JSON         NULL COMMENT 'feedback anónimo del colaborador al líder',
  next_steps          TEXT         NULL,
  ai_summary          TEXT         NULL COMMENT 'Resumen generado por IA de la sesión',
  created_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (leader_id)   REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (employee_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_employee (employee_id, meeting_date),
  INDEX idx_leader   (leader_id,   meeting_date)
) ENGINE=InnoDB;

-- 5. Historial de conversaciones del HR Assistant
CREATE TABLE IF NOT EXISTS chat_history (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED NOT NULL,
  session_id  VARCHAR(64)  NOT NULL,
  role        ENUM('user','assistant') NOT NULL,
  content     TEXT         NOT NULL,
  sources     JSON         NULL,
  escalated   TINYINT(1)   NOT NULL DEFAULT 0,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_session (user_id, session_id, created_at)
) ENGINE=InnoDB;
