-- ─────────────────────────────────────────────────────────────────────────────
-- Migración v7 — Tabla de documentos RAG
-- ─────────────────────────────────────────────────────────────────────────────

USE tallerrhh;

CREATE TABLE IF NOT EXISTS rag_documents (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  original_name VARCHAR(255)  NOT NULL,
  filename      VARCHAR(255)  NOT NULL COMMENT 'Nombre en disco (único)',
  file_size     INT UNSIGNED  NOT NULL COMMENT 'Bytes',
  mime_type     VARCHAR(100)  NOT NULL,
  status        ENUM('processing','active','error') NOT NULL DEFAULT 'processing',
  sections      JSON          NULL    COMMENT 'Secciones detectadas tras indexar',
  uploaded_by   INT UNSIGNED  NOT NULL,
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_status (status)
) ENGINE=InnoDB;
