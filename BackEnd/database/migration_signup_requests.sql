-- ─────────────────────────────────────────────────────────────────────────────
-- Solicitudes de registro (auto-registro con aprobación de Admin)
-- Ejecutar en el SQL Editor de Supabase tras supabase_schema.sql
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS signup_requests (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name        varchar(150) NOT NULL,
  email       varchar(255) NOT NULL,
  area_id     integer REFERENCES areas(id), -- lo asigna el Admin al aprobar
  position    varchar(100),
  status      varchar(10) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  role_id     smallint REFERENCES roles(id),
  reviewed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_signup_requests_status ON signup_requests (status, created_at);

-- Un correo no puede tener más de una solicitud pendiente o ya aprobada a la vez
-- (sí puede volver a registrarse si su solicitud anterior fue rechazada)
CREATE UNIQUE INDEX IF NOT EXISTS idx_signup_requests_email_active
  ON signup_requests (email)
  WHERE status IN ('pending', 'approved');

ALTER TABLE signup_requests ENABLE ROW LEVEL SECURITY;
