import pool from '../../config/db.js';
import * as XLSX from 'xlsx';
import { categorizeENPSComments, generateENPSExecutiveSummary } from '../../services/iaService.js';

const calcSeniorityYears = (hireDate) => {
  if (!hireDate) return null;
  const ms = Date.now() - new Date(hireDate).getTime();
  return Math.floor(ms / (365.25 * 24 * 3600 * 1000));
};

// ── GET /api/v1/enps/surveys ──────────────────────────────────────────────────
export const getSurveys = async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      `SELECT s.id, s.title, s.description, s.period, s.status,
              s.start_date, s.end_date, s.created_at,
              u.name AS created_by_name,
              COUNT(r.id) AS response_count
       FROM   surveys s
       JOIN   users u ON s.created_by = u.id
       LEFT JOIN enps_responses r ON r.survey_id = s.id
       GROUP  BY s.id
       ORDER  BY s.created_at DESC`
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/v1/enps/surveys/active ──────────────────────────────────────────
export const getActiveSurvey = async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      `SELECT id, title, description, period, start_date, end_date
       FROM   surveys
       WHERE  status = 'active'
       ORDER  BY created_at DESC
       LIMIT  1`
    );
    if (!rows.length) {
      return res.json({ success: true, data: null, message: 'No hay encuesta activa en este momento.' });
    }
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/v1/enps/surveys (RH/Admin) ─────────────────────────────────────
export const createSurvey = async (req, res, next) => {
  try {
    const { title, description, period, startDate, endDate } = req.body;

    if (!title?.trim()) {
      const err = new Error('El título de la encuesta es requerido');
      err.status = 400;
      return next(err);
    }

    // Cerrar encuestas activas anteriores
    await pool.execute(`UPDATE surveys SET status = 'closed' WHERE status = 'active'`);

    const [result] = await pool.execute(
      `INSERT INTO surveys (title, description, period, status, start_date, end_date, created_by)
       VALUES (?, ?, ?, 'active', ?, ?, ?)`,
      [title, description ?? null, period ?? null, startDate ?? null, endDate ?? null, req.user.id]
    );

    res.status(201).json({
      success: true,
      message: 'Encuesta creada y activada correctamente',
      data: { surveyId: result.insertId },
    });
  } catch (error) {
    next(error);
  }
};

// ── PUT /api/v1/enps/surveys/:id/status (RH/Admin) ───────────────────────────
export const updateSurveyStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const id = Number(req.params.id);

    if (!['draft', 'active', 'closed'].includes(status)) {
      const err = new Error('status debe ser: draft, active o closed');
      err.status = 422;
      return next(err);
    }

    if (status === 'active') {
      await pool.execute(`UPDATE surveys SET status = 'closed' WHERE status = 'active' AND id != ?`, [id]);
    }

    await pool.execute('UPDATE surveys SET status = ? WHERE id = ?', [status, id]);
    res.json({ success: true, message: `Encuesta actualizada a estado: ${status}` });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/v1/enps/responses ───────────────────────────────────────────────
export const createResponse = async (req, res, next) => {
  try {
    const { surveyId, enpsScore, likertScores, valuedComment, improvementComment } = req.body;

    const area_id        = req.user.area_id;
    const position       = req.user.position ?? null;
    const seniorityYears = calcSeniorityYears(req.user.hire_date);

    if (!surveyId || enpsScore === undefined) {
      const err = new Error('surveyId y enpsScore son requeridos');
      err.status = 400;
      return next(err);
    }
    if (enpsScore < 0 || enpsScore > 10) {
      const err = new Error('enpsScore debe estar entre 0 y 10');
      err.status = 422;
      return next(err);
    }

    // Verificar que la encuesta exista y esté activa
    const [surveyRows] = await pool.execute(
      `SELECT id FROM surveys WHERE id = ? AND status = 'active'`, [surveyId]
    );
    if (!surveyRows.length) {
      const err = new Error('La encuesta no existe o no está activa');
      err.status = 404;
      return next(err);
    }

    const { valuedCategory, improvementCategory } = await categorizeENPSComments(
      valuedComment, improvementComment
    );

    const likertJson = JSON.stringify(likertScores ?? {});

    const [result] = await pool.execute(
      `INSERT INTO enps_responses
         (survey_id, area_id, position, seniority_years, enps_score,
          likert_scores, valued_comment, ai_valued_category,
          improvement_comment, ai_improvement_category)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        surveyId, area_id, position, seniorityYears, enpsScore,
        likertJson,
        valuedComment ?? null, valuedCategory ?? null,
        improvementComment ?? null, improvementCategory ?? null,
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Respuesta eNPS registrada de forma anónima',
      data: { responseId: result.insertId, aiCategories: { valuedCategory, improvementCategory } },
    });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/v1/enps/dashboard/executive-summary/:surveyId ───────────────────
export const getExecutiveSummary = async (req, res, next) => {
  try {
    const surveyId = Number(req.params.surveyId);
    if (!surveyId || isNaN(surveyId)) {
      const err = new Error('surveyId debe ser un número válido');
      err.status = 400;
      return next(err);
    }

    const [statsRows] = await pool.execute(
      `SELECT COUNT(*)                        AS total,
              ROUND(AVG(enps_score), 2)       AS avgEnps,
              SUM(enps_score >= 9)            AS promoters,
              SUM(enps_score BETWEEN 7 AND 8) AS passives,
              SUM(enps_score <= 6)            AS detractors
       FROM enps_responses WHERE survey_id = ?`,
      [surveyId]
    );

    const s = statsRows[0];
    if (!s.total) {
      return res.json({ success: true, data: { surveyId, message: 'No hay respuestas.', stats: null, aiSummary: null } });
    }

    const total      = Number(s.total)      || 0;
    const promoters  = Number(s.promoters)  || 0;
    const passives   = Number(s.passives)   || 0;
    const detractors = Number(s.detractors) || 0;
    const enpsScore  = Math.round(((promoters - detractors) / total) * 100);

    const [categoryStats] = await pool.execute(
      `SELECT ai_valued_category, ai_improvement_category, COUNT(*) AS count
       FROM   enps_responses
       WHERE  survey_id = ? AND (ai_valued_category IS NOT NULL OR ai_improvement_category IS NOT NULL)
       GROUP  BY ai_valued_category, ai_improvement_category`,
      [surveyId]
    );

    const [commentRows] = await pool.execute(
      `SELECT valued_comment AS valued, improvement_comment AS improvement
       FROM   enps_responses
       WHERE  survey_id = ? AND (valued_comment IS NOT NULL OR improvement_comment IS NOT NULL)
       LIMIT  50`,
      [surveyId]
    );

    const [likertRows] = await pool.execute(
      `SELECT likert_scores FROM enps_responses WHERE survey_id = ?`, [surveyId]
    );

    let likertSum = 0, likertCount = 0;
    likertRows.forEach(({ likert_scores }) => {
      const scores = Array.isArray(likert_scores) ? likert_scores : JSON.parse(likert_scores ?? '{}');
      Object.values(scores).forEach((v) => { if (typeof v === 'number') { likertSum += v; likertCount++; } });
    });

    const surveyStats = {
      total, enpsScore,
      promotersPct:  Math.round((promoters  / total) * 100),
      passivesPct:   Math.round((passives   / total) * 100),
      detractorsPct: Math.round((detractors / total) * 100),
      avgLikert:     likertCount > 0 ? (likertSum / likertCount).toFixed(2) : 'N/A',
    };

    const aiSummary = await generateENPSExecutiveSummary(surveyStats, commentRows);

    res.json({ success: true, data: { surveyId, stats: surveyStats, categoryDistribution: categoryStats, aiSummary } });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/v1/enps/dashboard/likert-breakdown/:surveyId ─────────────────────
export const getLikertBreakdown = async (req, res, next) => {
  try {
    const surveyId = Number(req.params.surveyId);

    const [rows] = await pool.execute(
      'SELECT likert_scores FROM enps_responses WHERE survey_id = ?',
      [surveyId]
    );

    if (!rows.length) {
      return res.json({ success: true, data: [] });
    }

    // Agregar totales por dimensión en JS (JSON flexible)
    const totals = {}, counts = {};
    rows.forEach(({ likert_scores }) => {
      const s = Array.isArray(likert_scores) ? likert_scores
              : typeof likert_scores === 'string' ? JSON.parse(likert_scores)
              : likert_scores;
      Object.entries(s ?? {}).forEach(([k, v]) => {
        if (typeof v === 'number') {
          totals[k] = (totals[k] ?? 0) + v;
          counts[k] = (counts[k] ?? 0) + 1;
        }
      });
    });

    const LABELS = {
      leadership:    'Liderazgo',
      communication: 'Comunicación',
      growth:        'Crecimiento',
      benefits:      'Beneficios',
      environment:   'Ambiente',
      balance:       'Balance V/T',
    };

    const breakdown = Object.keys(totals).map((key) => ({
      key,
      label:    LABELS[key] ?? key,
      avg:      parseFloat((totals[key] / counts[key]).toFixed(2)),
      count:    counts[key],
      fullMark: 5,
    }));

    res.json({ success: true, data: breakdown });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/v1/enps/export/:surveyId ────────────────────────────────────────
export const exportToExcel = async (req, res, next) => {
  try {
    const surveyId = Number(req.params.surveyId);

    const [surveyRows] = await pool.execute('SELECT title, period FROM surveys WHERE id = ?', [surveyId]);
    const survey = surveyRows[0] ?? { title: `Encuesta ${surveyId}`, period: '' };

    const [responses] = await pool.execute(
      `SELECT r.area_id, a.name AS area_name, r.position, r.seniority_years,
              r.enps_score, r.likert_scores,
              r.valued_comment, r.improvement_comment,
              r.ai_valued_category, r.ai_improvement_category,
              r.created_at
       FROM   enps_responses r
       JOIN   areas a ON r.area_id = a.id
       WHERE  r.survey_id = ?
       ORDER  BY r.created_at`,
      [surveyId]
    );

    // Hoja 1: Respuestas individuales
    const respSheet = responses.map((r, i) => {
      const likert = Array.isArray(r.likert_scores) ? r.likert_scores
                   : typeof r.likert_scores === 'string' ? JSON.parse(r.likert_scores)
                   : r.likert_scores ?? {};
      return {
        '#':                    i + 1,
        'Área':                 r.area_name,
        'Puesto':               r.position ?? 'N/A',
        'Antigüedad (años)':    r.seniority_years ?? 'N/A',
        'Score eNPS':           r.enps_score,
        'Categoría':            r.enps_score >= 9 ? 'Promotor' : r.enps_score >= 7 ? 'Pasivo' : 'Detractor',
        'Liderazgo':            likert.leadership    ?? '',
        'Comunicación':         likert.communication ?? '',
        'Crecimiento':          likert.growth        ?? '',
        'Beneficios':           likert.benefits      ?? '',
        'Ambiente':             likert.environment   ?? '',
        'Balance V/T':          likert.balance       ?? '',
        'Lo que valora':        r.valued_comment       ?? '',
        'Categoría comentario positivo': r.ai_valued_category ?? '',
        'Lo que mejoraría':     r.improvement_comment  ?? '',
        'Categoría comentario mejora':   r.ai_improvement_category ?? '',
        'Fecha':                new Date(r.created_at).toLocaleDateString('es-CR'),
      };
    });

    // Hoja 2: Resumen
    const total      = responses.length;
    const promoters  = responses.filter((r) => r.enps_score >= 9).length;
    const passives   = responses.filter((r) => r.enps_score >= 7 && r.enps_score <= 8).length;
    const detractors = responses.filter((r) => r.enps_score <= 6).length;
    const enps       = total > 0 ? Math.round(((promoters - detractors) / total) * 100) : 0;

    const summarySheet = [
      { 'Métrica': 'Encuesta',       'Valor': survey.title },
      { 'Métrica': 'Período',        'Valor': survey.period ?? 'N/A' },
      { 'Métrica': 'Total respuestas','Valor': total },
      { 'Métrica': 'eNPS Score',     'Valor': enps },
      { 'Métrica': 'Promotores',     'Valor': `${promoters} (${Math.round((promoters/total)*100)}%)` },
      { 'Métrica': 'Pasivos',        'Valor': `${passives} (${Math.round((passives/total)*100)}%)` },
      { 'Métrica': 'Detractores',    'Valor': `${detractors} (${Math.round((detractors/total)*100)}%)` },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summarySheet), 'Resumen');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(respSheet),    'Respuestas');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.set({
      'Content-Type':        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="eNPS-${survey.period ?? surveyId}.xlsx"`,
    });
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};

// ── GET /api/v1/enps/dashboard/segmented/:surveyId ───────────────────────────
// eNPS desglosado por área y rango de antigüedad
export const getSegmentedResults = async (req, res, next) => {
  try {
    const surveyId = Number(req.params.surveyId);

    // Por área
    const [byArea] = await pool.execute(
      `SELECT a.name AS segment,
              COUNT(*)                        AS total,
              SUM(r.enps_score >= 9)          AS promoters,
              SUM(r.enps_score BETWEEN 7 AND 8) AS passives,
              SUM(r.enps_score <= 6)          AS detractors,
              ROUND(AVG(r.enps_score), 2)     AS avgScore
       FROM   enps_responses r
       JOIN   areas a ON r.area_id = a.id
       WHERE  r.survey_id = ?
       GROUP  BY a.id, a.name
       ORDER  BY a.name`,
      [surveyId]
    );

    // Por antigüedad (rangos)
    const [bySeniority] = await pool.execute(
      `SELECT
         CASE
           WHEN seniority_years < 1  THEN 'Menos de 1 año'
           WHEN seniority_years < 3  THEN '1-3 años'
           WHEN seniority_years < 5  THEN '3-5 años'
           ELSE 'Más de 5 años'
         END                                 AS segment,
         COUNT(*)                            AS total,
         SUM(enps_score >= 9)                AS promoters,
         SUM(enps_score BETWEEN 7 AND 8)     AS passives,
         SUM(enps_score <= 6)                AS detractors,
         ROUND(AVG(enps_score), 2)           AS avgScore
       FROM  enps_responses
       WHERE survey_id = ? AND seniority_years IS NOT NULL
       GROUP BY segment
       ORDER BY MIN(seniority_years)`,
      [surveyId]
    );

    // Calcular eNPS por segmento
    const calcEnps = (row) => {
      const t = Number(row.total) || 1;
      return Math.round(((Number(row.promoters) - Number(row.detractors)) / t) * 100);
    };

    const format = (rows) => rows.map((r) => ({
      segment:      r.segment,
      total:        Number(r.total),
      enpsScore:    calcEnps(r),
      promotersPct: Math.round((Number(r.promoters) / Number(r.total)) * 100),
      passivesPct:  Math.round((Number(r.passives)  / Number(r.total)) * 100),
      detractorsPct:Math.round((Number(r.detractors)/ Number(r.total)) * 100),
      avgScore:     Number(r.avgScore),
    }));

    res.json({ success: true, data: { byArea: format(byArea), bySeniority: format(bySeniority) } });
  } catch (error) {
    next(error);
  }
};
