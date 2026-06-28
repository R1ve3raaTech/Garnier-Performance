-- ─────────────────────────────────────────────────────────────────────────────
-- Ecosistema Digital RRHH Garnier — Schema Postgres / Supabase
-- Ejecutar completo en el SQL Editor de Supabase (proyecto rvzugabqmwydnxjybmyq)
-- ─────────────────────────────────────────────────────────────────────────────

-- ── CATÁLOGOS ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS roles (
  id   smallint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name varchar(50) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS areas (
  id   integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name varchar(100) NOT NULL UNIQUE
);

INSERT INTO roles (name) VALUES ('Funcionario'), ('Jefatura'), ('RH'), ('Admin')
  ON CONFLICT (name) DO NOTHING;

INSERT INTO areas (name) VALUES ('Tecnología'), ('Recursos Humanos'), ('Ventas'), ('Operaciones')
  ON CONFLICT (name) DO NOTHING;

-- ── PERFILES (extiende auth.users de Supabase Auth) ───────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name       varchar(150) NOT NULL,
  email      varchar(255) NOT NULL UNIQUE,
  role_id    smallint NOT NULL REFERENCES roles(id),
  area_id    integer  NOT NULL REFERENCES areas(id),
  position   varchar(100),
  hire_date  date,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ── PROYECTO 02: PulseWork (anónimo por diseño, sin user_id) ──────────────────
CREATE TABLE IF NOT EXISTS pulse_entries (
  id                bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  area_id           integer NOT NULL REFERENCES areas(id),
  emotion_score     smallint NOT NULL CHECK (emotion_score BETWEEN 1 AND 5),
  influence_factors jsonb NOT NULL DEFAULT '[]'::jsonb,
  open_comment      text,
  ai_sentiment      varchar(20) CHECK (ai_sentiment IN ('POSITIVO','NEUTRO','NEGATIVO')),
  ai_keywords       jsonb,
  ai_crisis_flag    boolean NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pulse_area_created ON pulse_entries (area_id, created_at);

-- ── PROYECTO 03: eNPS ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS surveys (
  id          integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title       varchar(255) NOT NULL,
  description text,
  period      varchar(50),
  status      varchar(10) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','closed')),
  start_date  date,
  end_date    date,
  created_by  uuid NOT NULL REFERENCES profiles(id),
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_surveys_status ON surveys (status);

CREATE TABLE IF NOT EXISTS enps_responses (
  id                       bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  survey_id                integer NOT NULL REFERENCES surveys(id),
  area_id                  integer NOT NULL REFERENCES areas(id),
  position                 varchar(100),
  seniority_years          smallint,
  enps_score               smallint NOT NULL CHECK (enps_score BETWEEN 0 AND 10),
  likert_scores            jsonb NOT NULL DEFAULT '{}'::jsonb,
  valued_comment           text,
  improvement_comment      text,
  ai_valued_category       varchar(100),
  ai_improvement_category  varchar(100),
  created_at               timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_enps_survey_area ON enps_responses (survey_id, area_id);

-- ── PROYECTO: Performance (goals) ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS goals (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type          varchar(10) NOT NULL CHECK (type IN ('OKR','KPI','MCI')),
  title         varchar(255) NOT NULL,
  description   text,
  target_value  numeric(10,2),
  current_value numeric(10,2),
  unit          varchar(50),
  due_date      date,
  status        varchar(15) NOT NULL DEFAULT 'PENDIENTE'
                  CHECK (status IN ('PENDIENTE','EN_PROGRESO','COMPLETADO','CANCELADO')),
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_goals_user_status ON goals (user_id, status);

-- ── HR Assistant: historial y consultas sin resolver ──────────────────────────
CREATE TABLE IF NOT EXISTS unresolved_queries (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  question    text NOT NULL,
  status      varchar(15) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_review','resolved')),
  resolved_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_unresolved_status_created ON unresolved_queries (status, created_at);

CREATE TABLE IF NOT EXISTS chat_history (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_id varchar(64) NOT NULL,
  role       varchar(10) NOT NULL CHECK (role IN ('user','assistant')),
  content    text NOT NULL,
  sources    jsonb,
  escalated  boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_chat_session ON chat_history (user_id, session_id, created_at);

-- ── RAG documents ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rag_documents (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  original_name varchar(255) NOT NULL,
  filename      varchar(255) NOT NULL,
  file_size     integer NOT NULL,
  mime_type     varchar(100) NOT NULL,
  status        varchar(12) NOT NULL DEFAULT 'processing' CHECK (status IN ('processing','active','error')),
  sections      jsonb,
  uploaded_by   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_rag_status ON rag_documents (status);

-- ── Recognitions ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS recognitions (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  from_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  to_user_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title        varchar(255) NOT NULL,
  message      text NOT NULL,
  category     varchar(20) NOT NULL
                  CHECK (category IN ('logro','colaboracion','innovacion','liderazgo','servicio','actitud')),
  is_public    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_recognitions_to_user   ON recognitions (to_user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_recognitions_from_user ON recognitions (from_user_id, created_at);

-- ── Feedbacks ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS feedbacks (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  from_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  to_user_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type         varchar(20) NOT NULL CHECK (type IN ('leader_to_collab','collab_to_leader','peer')),
  period       varchar(50),
  scores       jsonb NOT NULL DEFAULT '{}'::jsonb,
  comment      text,
  is_anonymous boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_feedbacks_to_user ON feedbacks (to_user_id, created_at);

-- ── Meeting records (1:1) ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS meeting_records (
  id                bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  leader_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  employee_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  meeting_date      date NOT NULL,
  commitments       jsonb,
  leader_feedback   jsonb,
  employee_feedback jsonb,
  next_steps        text,
  ai_summary        text,
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_meetings_employee ON meeting_records (employee_id, meeting_date);
CREATE INDEX IF NOT EXISTS idx_meetings_leader   ON meeting_records (leader_id, meeting_date);

-- ─────────────────────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- El backend Express accede siempre con la service_role key (bypassa RLS).
-- El frontend nunca llama a Supabase directamente. Por eso se habilita RLS
-- en todas las tablas SIN policies — deny-all por defecto para cualquier
-- acceso que use la anon key.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE roles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE areas             ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE pulse_entries     ENABLE ROW LEVEL SECURITY;
ALTER TABLE surveys           ENABLE ROW LEVEL SECURITY;
ALTER TABLE enps_responses    ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals              ENABLE ROW LEVEL SECURITY;
ALTER TABLE unresolved_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_history        ENABLE ROW LEVEL SECURITY;
ALTER TABLE rag_documents       ENABLE ROW LEVEL SECURITY;
ALTER TABLE recognitions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedbacks           ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_records     ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- FUNCIONES RPC (agregaciones que PostgREST no soporta vía .select())
-- ─────────────────────────────────────────────────────────────────────────────

-- eNPS: resumen ejecutivo (stats globales de una encuesta)
CREATE OR REPLACE FUNCTION enps_executive_stats(p_survey_id integer)
RETURNS TABLE (total bigint, avg_enps numeric, promoters bigint, passives bigint, detractors bigint)
LANGUAGE sql STABLE AS $$
  SELECT
    COUNT(*),
    ROUND(AVG(enps_score), 2),
    COUNT(*) FILTER (WHERE enps_score >= 9),
    COUNT(*) FILTER (WHERE enps_score BETWEEN 7 AND 8),
    COUNT(*) FILTER (WHERE enps_score <= 6)
  FROM enps_responses WHERE survey_id = p_survey_id;
$$;

-- eNPS: distribución de categorías IA
CREATE OR REPLACE FUNCTION enps_category_distribution(p_survey_id integer)
RETURNS TABLE (ai_valued_category varchar, ai_improvement_category varchar, count bigint)
LANGUAGE sql STABLE AS $$
  SELECT ai_valued_category, ai_improvement_category, COUNT(*)
  FROM enps_responses
  WHERE survey_id = p_survey_id
    AND (ai_valued_category IS NOT NULL OR ai_improvement_category IS NOT NULL)
  GROUP BY ai_valued_category, ai_improvement_category;
$$;

-- eNPS: lista de encuestas con conteo de respuestas
CREATE OR REPLACE FUNCTION enps_surveys_with_counts()
RETURNS TABLE (
  id integer, title varchar, description text, period varchar, status varchar,
  start_date date, end_date date, created_at timestamptz,
  created_by_name varchar, response_count bigint
)
LANGUAGE sql STABLE AS $$
  SELECT s.id, s.title, s.description, s.period, s.status,
         s.start_date, s.end_date, s.created_at,
         p.name, COUNT(r.id)
  FROM surveys s
  JOIN profiles p ON s.created_by = p.id
  LEFT JOIN enps_responses r ON r.survey_id = s.id
  GROUP BY s.id, p.name
  ORDER BY s.created_at DESC;
$$;

-- eNPS: segmentado por área
CREATE OR REPLACE FUNCTION enps_segmented_by_area(p_survey_id integer)
RETURNS TABLE (segment varchar, total bigint, promoters bigint, passives bigint, detractors bigint, avg_score numeric)
LANGUAGE sql STABLE AS $$
  SELECT a.name, COUNT(*),
         COUNT(*) FILTER (WHERE r.enps_score >= 9),
         COUNT(*) FILTER (WHERE r.enps_score BETWEEN 7 AND 8),
         COUNT(*) FILTER (WHERE r.enps_score <= 6),
         ROUND(AVG(r.enps_score), 2)
  FROM enps_responses r
  JOIN areas a ON r.area_id = a.id
  WHERE r.survey_id = p_survey_id
  GROUP BY a.id, a.name
  ORDER BY a.name;
$$;

-- eNPS: segmentado por antigüedad
CREATE OR REPLACE FUNCTION enps_segmented_by_seniority(p_survey_id integer)
RETURNS TABLE (segment text, total bigint, promoters bigint, passives bigint, detractors bigint, avg_score numeric)
LANGUAGE sql STABLE AS $$
  SELECT
    CASE
      WHEN seniority_years < 1 THEN 'Menos de 1 año'
      WHEN seniority_years < 3 THEN '1-3 años'
      WHEN seniority_years < 5 THEN '3-5 años'
      ELSE 'Más de 5 años'
    END,
    COUNT(*),
    COUNT(*) FILTER (WHERE enps_score >= 9),
    COUNT(*) FILTER (WHERE enps_score BETWEEN 7 AND 8),
    COUNT(*) FILTER (WHERE enps_score <= 6),
    ROUND(AVG(enps_score), 2)
  FROM enps_responses
  WHERE survey_id = p_survey_id AND seniority_years IS NOT NULL
  GROUP BY 1
  ORDER BY MIN(seniority_years);
$$;

-- PulseWork: stats agregadas (30 días) por área, con comparación últimos 7 vs 7 anteriores
CREATE OR REPLACE FUNCTION pulse_dashboard_stats(p_area_id integer)
RETURNS TABLE (
  total bigint, avg_score numeric, negative_count bigint, positive_count bigint,
  crisis_count bigint, avg_last7 numeric, avg_prev7 numeric
)
LANGUAGE sql STABLE AS $$
  SELECT
    COUNT(*),
    ROUND(AVG(emotion_score), 2),
    COUNT(*) FILTER (WHERE ai_sentiment = 'NEGATIVO'),
    COUNT(*) FILTER (WHERE ai_sentiment = 'POSITIVO'),
    COUNT(*) FILTER (WHERE ai_crisis_flag),
    ROUND(AVG(emotion_score) FILTER (WHERE created_at >= now() - interval '7 days'), 2),
    ROUND(AVG(emotion_score) FILTER (WHERE created_at BETWEEN now() - interval '14 days' AND now() - interval '7 days'), 2)
  FROM pulse_entries
  WHERE area_id = p_area_id AND created_at >= now() - interval '30 days';
$$;

-- PulseWork: tendencia diaria
CREATE OR REPLACE FUNCTION pulse_emotion_trend(p_area_id integer, p_days integer)
RETURNS TABLE (date date, avg_score numeric, total bigint, positive bigint, negative bigint, neutral bigint)
LANGUAGE sql STABLE AS $$
  SELECT
    created_at::date,
    ROUND(AVG(emotion_score), 2),
    COUNT(*),
    COUNT(*) FILTER (WHERE ai_sentiment = 'POSITIVO'),
    COUNT(*) FILTER (WHERE ai_sentiment = 'NEGATIVO'),
    COUNT(*) FILTER (WHERE ai_sentiment = 'NEUTRO')
  FROM pulse_entries
  WHERE area_id = p_area_id AND created_at >= now() - (p_days || ' days')::interval
  GROUP BY created_at::date
  ORDER BY 1 ASC;
$$;

-- Grants para que PostgREST (rol service_role/authenticated) pueda ejecutar las RPC
GRANT EXECUTE ON FUNCTION enps_executive_stats(integer)        TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION enps_category_distribution(integer)  TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION enps_surveys_with_counts()           TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION enps_segmented_by_area(integer)      TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION enps_segmented_by_seniority(integer) TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION pulse_dashboard_stats(integer)       TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION pulse_emotion_trend(integer, integer) TO service_role, authenticated;
