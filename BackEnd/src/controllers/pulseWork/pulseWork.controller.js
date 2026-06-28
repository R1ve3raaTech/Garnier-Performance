import supabase from '../../config/supabaseClient.js';
import { analyzePulseComment, detectEmotionalPatterns } from '../../services/iaService.js';

// ── POST /api/v1/pulse-work/entries ───────────────────────────────────────────
export const createEntry = async (req, res, next) => {
  try {
    const { emotionScore, influenceFactors, openComment } = req.body;
    const area_id = req.user.area_id;

    if (emotionScore === undefined) {
      const err = new Error('emotionScore es requerido');
      err.status = 400;
      return next(err);
    }
    if (emotionScore < 1 || emotionScore > 5) {
      const err = new Error('emotionScore debe estar entre 1 y 5');
      err.status = 422;
      return next(err);
    }

    let aiSentiment  = null;
    let aiKeywords   = null;
    let aiCrisisFlag = false;

    if (openComment?.trim()) {
      const analysis  = await analyzePulseComment(openComment);
      aiSentiment     = analysis.sentiment  ?? null;
      aiCrisisFlag    = !!analysis.crisisFlag;
      aiKeywords      = analysis.keywords?.length ? analysis.keywords : null;
    }

    // userId NO se inserta — anonimato absoluto por diseño
    const { data, error } = await supabase.from('pulse_entries').insert({
      area_id, emotion_score: emotionScore, influence_factors: influenceFactors ?? [],
      open_comment: openComment ?? null,
      ai_sentiment: aiSentiment, ai_keywords: aiKeywords, ai_crisis_flag: aiCrisisFlag,
    }).select('id').single();
    if (error) throw error;

    res.status(201).json({
      success: true,
      message: 'Micro-pulso registrado de forma anónima',
      data: {
        entryId: data.id,
        aiAnalysis: openComment?.trim() ? {
          sentiment:  aiSentiment,
          keywords:   aiKeywords ?? [],
          crisisFlag: aiCrisisFlag,
        } : null,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/v1/pulse-work/dashboard/alerts/:areaId ───────────────────────────
export const getDashboardAlerts = async (req, res, next) => {
  try {
    const areaId = Number(req.params.areaId);
    if (!areaId || isNaN(areaId)) {
      const err = new Error('areaId debe ser un número válido');
      err.status = 400;
      return next(err);
    }

    const { data: statsRows, error: statsError } = await supabase
      .rpc('pulse_dashboard_stats', { p_area_id: areaId });
    if (statsError) throw statsError;

    const stats = statsRows[0];

    if (!stats || !stats.total) {
      return res.status(200).json({
        success: true,
        data: { areaId, alertLevel: 'SIN_DATOS', message: 'No hay registros en los últimos 30 días.', stats: null, aiAnalysis: null, crisisAlerts: 0 },
      });
    }

    const { data: areaRow } = await supabase.from('areas').select('name').eq('id', areaId).single();
    const areaName = areaRow?.name ?? `Área ${areaId}`;

    const { data: keywordRows, error: kwError } = await supabase
      .from('pulse_entries')
      .select('ai_keywords')
      .eq('area_id', areaId)
      .eq('ai_sentiment', 'NEGATIVO')
      .not('ai_keywords', 'is', null)
      .gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString());
    if (kwError) throw kwError;

    const keywordFreq = {};
    keywordRows.forEach(({ ai_keywords }) => {
      (ai_keywords ?? []).forEach((kw) => { keywordFreq[kw] = (keywordFreq[kw] ?? 0) + 1; });
    });

    const topKeywords = Object.entries(keywordFreq)
      .sort((a, b) => b[1] - a[1]).slice(0, 5)
      .map(([kw, count]) => `${kw} (×${count})`);

    const total         = Number(stats.total)          || 0;
    const negativeCount = Number(stats.negative_count) || 0;
    const positiveCount = Number(stats.positive_count) || 0;
    const crisisCount   = Number(stats.crisis_count)   || 0;
    const weekTrend     = stats.avg_last7 && stats.avg_prev7
      ? stats.avg_last7 >= stats.avg_prev7 ? 'ascendente' : 'descendente'
      : 'insuficientes datos';

    const derivedStats = {
      total, avgScore: stats.avg_score,
      negativeCount, negativePct:  total > 0 ? Math.round((negativeCount / total) * 100) : 0,
      positiveCount, positivePct:  total > 0 ? Math.round((positiveCount / total) * 100) : 0,
      crisisCount,   crisisPct:    total > 0 ? Math.round((crisisCount   / total) * 100) : 0,
      weekTrend,
    };

    const aiAnalysis = await detectEmotionalPatterns(areaName, derivedStats, topKeywords);

    res.status(200).json({
      success: true,
      data: { areaId, areaName, period: 'Últimos 30 días', stats: derivedStats, topNegativeKeywords: topKeywords, aiAnalysis },
    });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/v1/pulse-work/crisis-alerts/:areaId ──────────────────────────────
export const getCrisisAlerts = async (req, res, next) => {
  try {
    const areaId = Number(req.params.areaId);
    if (!areaId || isNaN(areaId)) {
      const err = new Error('areaId debe ser un número válido');
      err.status = 400;
      return next(err);
    }

    const { data: rows, error } = await supabase
      .from('pulse_entries')
      .select('id, area_id, emotion_score, ai_keywords, created_at')
      .eq('area_id', areaId)
      .eq('ai_crisis_flag', true)
      .gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString())
      .order('created_at', { ascending: false });
    if (error) throw error;

    const { data: areaRow } = await supabase.from('areas').select('name').eq('id', areaId).single();

    const alerts = rows.map((r) => ({ ...r, ai_keywords: r.ai_keywords ?? [] }));

    res.status(200).json({
      success: true,
      data: {
        areaId,
        areaName:    areaRow?.name ?? `Área ${areaId}`,
        totalCrisis: alerts.length,
        message:     alerts.length > 0
          ? `⚠️ Se detectaron ${alerts.length} señal(es) de crisis en los últimos 30 días. Se recomienda atención de RH.`
          : 'No se detectaron señales de crisis en el período.',
        alerts,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/v1/pulse-work/trend/:areaId ─────────────────────────────────────
export const getEmotionTrend = async (req, res, next) => {
  try {
    const areaId = Number(req.params.areaId);
    const days   = Math.min(Number(req.query.days ?? 30), 90);

    if (!areaId || isNaN(areaId)) {
      const err = new Error('areaId debe ser un número válido');
      err.status = 400;
      return next(err);
    }

    const { data: rows, error } = await supabase
      .rpc('pulse_emotion_trend', { p_area_id: areaId, p_days: days });
    if (error) throw error;

    const { data: areaRow } = await supabase.from('areas').select('name').eq('id', areaId).single();

    res.json({
      success: true,
      data: {
        areaId,
        areaName: areaRow?.name ?? `Área ${areaId}`,
        days,
        trend: rows.map((r) => ({
          date:     r.date,
          avgScore: Number(r.avg_score),
          total:    Number(r.total),
          positive: Number(r.positive) || 0,
          negative: Number(r.negative) || 0,
          neutral:  Number(r.neutral)  || 0,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};
