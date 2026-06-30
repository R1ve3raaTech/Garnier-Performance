-- ─────────────────────────────────────────────────────────────────────────────
-- v2: el área y el puesto los asigna el Admin al aprobar, no el solicitante
-- Ejecutar en el SQL Editor de Supabase tras migration_signup_requests.sql
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE signup_requests ALTER COLUMN area_id DROP NOT NULL;
