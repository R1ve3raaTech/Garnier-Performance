import supabase from '../../config/supabaseClient.js';
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
    const { data, error } = await supabase.rpc('enps_surveys_with_counts');
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/v1/enps/surveys/active ──────────────────────────────────────────
export const getActiveSurvey = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('surveys')
      .select('id, title, description, period, start_date, end_date')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1);
    if (error) throw error;

    if (!data.length) {
      return res.json({ success: true, data: null, message: 'No hay encuesta activa en este momento.' });
    }
    res.json({ success: true, data: data[0] });
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

    await supabase.from('surveys').update({ status: 'closed' }).eq('status', 'active');

    const { data, error } = await supabase.from('surveys').insert({
      title, description: description ?? null, period: period ?? null,
      status: 'active', start_date: startDate ?? null, end_date: endDate ?? null,
      created_by: req.user.id,
    }).select('id').single();
    if (error) throw error;

    res.status(201).json({
      success: true,
      message: 'Encuesta creada y activada correctamente',
      data: { surveyId: data.id },
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
      await supabase.from('surveys').update({ status: 'closed' }).eq('status', 'active').neq('id', id);
    }

    const { error } = await supabase.from('surveys').update({ status }).eq('id', id);
    if (error) throw error;

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

    const { data: surveyRows, error: surveyError } = await supabase
      .from('surveys').select('id').eq('id', surveyId).eq('status', 'active');
    if (surveyError) throw surveyError;
    if (!surveyRows.length) {
      const err = new Error('La encuesta no existe o no está activa');
      err.status = 404;
      return next(err);
    }

    const { valuedCategory, improvementCategory } = await categorizeENPSComments(
      valuedComment, improvementComment
    );

    const { data, error } = await supabase.from('enps_responses').insert({
      survey_id: surveyId, area_id, position, seniority_years: seniorityYears, enps_score: enpsScore,
      likert_scores: likertScores ?? {},
      valued_comment: valuedComment ?? null, ai_valued_category: valuedCategory ?? null,
      improvement_comment: improvementComment ?? null, ai_improvement_category: improvementCategory ?? null,
    }).select('id').single();
    if (error) throw error;

    res.status(201).json({
      success: true,
      message: 'Respuesta eNPS registrada de forma anónima',
      data: { responseId: data.id, aiCategories: { valuedCategory, improvementCategory } },
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

    const { data: statsRows, error: statsError } = await supabase
      .rpc('enps_executive_stats', { p_survey_id: surveyId });
    if (statsError) throw statsError;

    const s = statsRows[0];
    if (!s || !s.total) {
      return res.json({ success: true, data: { surveyId, message: 'No hay respuestas.', stats: null, aiSummary: null } });
    }

    const total      = Number(s.total)      || 0;
    const promoters  = Number(s.promoters)  || 0;
    const passives   = Number(s.passives)   || 0;
    const detractors = Number(s.detractors) || 0;
    const enpsScore  = Math.round(((promoters - detractors) / total) * 100);

    const { data: categoryStats, error: catError } = await supabase
      .rpc('enps_category_distribution', { p_survey_id: surveyId });
    if (catError) throw catError;

    const { data: commentRows, error: commentError } = await supabase
      .from('enps_responses')
      .select('valued_comment, improvement_comment')
      .eq('survey_id', surveyId)
      .or('valued_comment.not.is.null,improvement_comment.not.is.null')
      .limit(50);
    if (commentError) throw commentError;

    const { data: likertRows, error: likertError } = await supabase
      .from('enps_responses').select('likert_scores').eq('survey_id', surveyId);
    if (likertError) throw likertError;

    let likertSum = 0, likertCount = 0;
    likertRows.forEach(({ likert_scores }) => {
      Object.values(likert_scores ?? {}).forEach((v) => { if (typeof v === 'number') { likertSum += v; likertCount++; } });
    });

    const surveyStats = {
      total, enpsScore,
      promotersPct:  Math.round((promoters  / total) * 100),
      passivesPct:   Math.round((passives   / total) * 100),
      detractorsPct: Math.round((detractors / total) * 100),
      avgLikert:     likertCount > 0 ? (likertSum / likertCount).toFixed(2) : 'N/A',
    };

    const aiSummary = await generateENPSExecutiveSummary(
      surveyStats,
      commentRows.map((c) => ({ valued: c.valued_comment, improvement: c.improvement_comment }))
    );

    res.json({ success: true, data: { surveyId, stats: surveyStats, categoryDistribution: categoryStats, aiSummary } });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/v1/enps/dashboard/likert-breakdown/:surveyId ─────────────────────
export const getLikertBreakdown = async (req, res, next) => {
  try {
    const surveyId = Number(req.params.surveyId);

    const { data: rows, error } = await supabase
      .from('enps_responses').select('likert_scores').eq('survey_id', surveyId);
    if (error) throw error;

    if (!rows.length) {
      return res.json({ success: true, data: [] });
    }

    const totals = {}, counts = {};
    rows.forEach(({ likert_scores }) => {
      Object.entries(likert_scores ?? {}).forEach(([k, v]) => {
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

    const { data: surveyRows } = await supabase.from('surveys').select('title, period').eq('id', surveyId);
    const survey = surveyRows?.[0] ?? { title: `Encuesta ${surveyId}`, period: '' };

    const { data: responses, error } = await supabase
      .from('enps_responses')
      .select('area_id, areas(name), position, seniority_years, enps_score, likert_scores, valued_comment, improvement_comment, ai_valued_category, ai_improvement_category, created_at')
      .eq('survey_id', surveyId)
      .order('created_at');
    if (error) throw error;

    const respSheet = responses.map((r, i) => {
      const likert = r.likert_scores ?? {};
      return {
        '#':                    i + 1,
        'Área':                 r.areas?.name,
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
export const getSegmentedResults = async (req, res, next) => {
  try {
    const surveyId = Number(req.params.surveyId);

    const { data: byArea, error: areaError } = await supabase
      .rpc('enps_segmented_by_area', { p_survey_id: surveyId });
    if (areaError) throw areaError;

    const { data: bySeniority, error: seniorityError } = await supabase
      .rpc('enps_segmented_by_seniority', { p_survey_id: surveyId });
    if (seniorityError) throw seniorityError;

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
      avgScore:     Number(r.avg_score),
    }));

    res.json({ success: true, data: { byArea: format(byArea), bySeniority: format(bySeniority) } });
  } catch (error) {
    next(error);
  }
};
