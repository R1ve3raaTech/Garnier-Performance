import pool from '../../config/db.js';
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
    let aiCrisisFlag = 0;

    if (openComment?.trim()) {
      const analysis  = await analyzePulseComment(openComment);
      aiSentiment     = analysis.sentiment  ?? null;
      aiCrisisFlag    = analysis.crisisFlag  ? 1 : 0;
      aiKeywords      = analysis.keywords?.length ? JSON.stringify(analysis.keywords) : null;
    }

    // emotionScore <= 2 sin comentario también puede ser señal — activar flag
    if (emotionScore <= 2 && aiCrisisFlag === 0) aiCrisisFlag = 0; // conservador: solo IA decide

    const factorsJson = JSON.stringify(influenceFactors ?? []);

    // userId NO se inserta — anonimato absoluto por diseño
    const [result] = await pool.execute(
      `INSERT INTO pulse_entries
         (area_id, emotion_score, influence_factors, open_comment,
          ai_sentiment, ai_keywords, ai_crisis_flag)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [area_id, emotionScore, factorsJson, openComment ?? null,
       aiSentiment, aiKeywords, aiCrisisFlag]
    );

    res.status(201).json({
      success: true,
      message: 'Micro-pulso registrado de forma anónima',
      data: {
        entryId: result.insertId,
        aiAnalysis: openComment?.trim() ? {
          sentiment:  aiSentiment,
          keywords:   aiKeywords ? JSON.parse(aiKeywords) : [],
          crisisFlag: aiCrisisFlag === 1,
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

    const [statsRows] = await pool.execute(
      `SELECT
         COUNT(*)                                              AS total,
         ROUND(AVG(emotion_score), 2)                        AS avgScore,
         SUM(ai_sentiment = 'NEGATIVO')                      AS negativeCount,
         SUM(ai_sentiment = 'POSITIVO')                      AS positiveCount,
         SUM(ai_crisis_flag = 1)                             AS crisisCount,
         ROUND(AVG(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
                        THEN emotion_score END), 2)          AS avgLast7,
         ROUND(AVG(CASE WHEN created_at BETWEEN DATE_SUB(NOW(), INTERVAL 14 DAY)
                                             AND DATE_SUB(NOW(), INTERVAL 7 DAY)
                        THEN emotion_score END), 2)          AS avgPrev7
       FROM pulse_entries
       WHERE area_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`,
      [areaId]
    );

    const stats = statsRows[0];

    if (!stats.total) {
      return res.status(200).json({
        success: true,
        data: { areaId, alertLevel: 'SIN_DATOS', message: 'No hay registros en los últimos 30 días.', stats: null, aiAnalysis: null, crisisAlerts: 0 },
      });
    }

    const [areaRows] = await pool.execute('SELECT name FROM areas WHERE id = ?', [areaId]);
    const areaName = areaRows[0]?.name ?? `Área ${areaId}`;

    const [keywordRows] = await pool.execute(
      `SELECT ai_keywords FROM pulse_entries
       WHERE  area_id = ? AND ai_sentiment = 'NEGATIVO'
         AND  ai_keywords IS NOT NULL
         AND  created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`,
      [areaId]
    );

    const keywordFreq = {};
    keywordRows.forEach(({ ai_keywords }) => {
      const parsed = Array.isArray(ai_keywords) ? ai_keywords : JSON.parse(ai_keywords);
      parsed.forEach((kw) => { keywordFreq[kw] = (keywordFreq[kw] ?? 0) + 1; });
    });

    const topKeywords = Object.entries(keywordFreq)
      .sort((a, b) => b[1] - a[1]).slice(0, 5)
      .map(([kw, count]) => `${kw} (×${count})`);

    const total         = Number(stats.total)         || 0;
    const negativeCount = Number(stats.negativeCount) || 0;
    const positiveCount = Number(stats.positiveCount) || 0;
    const crisisCount   = Number(stats.crisisCount)   || 0;
    const weekTrend     = stats.avgLast7 && stats.avgPrev7
      ? stats.avgLast7 >= stats.avgPrev7 ? 'ascendente' : 'descendente'
      : 'insuficientes datos';

    const derivedStats = {
      total, avgScore: stats.avgScore,
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

    const [rows] = await pool.execute(
      `SELECT id, area_id, emotion_score, ai_keywords, created_at
       FROM   pulse_entries
       WHERE  area_id = ? AND ai_crisis_flag = 1
         AND  created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
       ORDER  BY created_at DESC`,
      [areaId]
    );

    const [areaRows] = await pool.execute('SELECT name FROM areas WHERE id = ?', [areaId]);

    // Parsear keywords (mysql2 puede devolverlas ya parseadas)
    const alerts = rows.map(({ ai_keywords, ...rest }) => ({
      ...rest,
      ai_keywords: Array.isArray(ai_keywords) ? ai_keywords : (ai_keywords ? JSON.parse(ai_keywords) : []),
    }));

    res.status(200).json({
      success: true,
      data: {
        areaId,
        areaName:    areaRows[0]?.name ?? `Área ${areaId}`,
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

    const [rows] = await pool.execute(
      `SELECT DATE(created_at)                    AS date,
              ROUND(AVG(emotion_score), 2)        AS avgScore,
              COUNT(*)                            AS total,
              SUM(ai_sentiment = 'POSITIVO')      AS positive,
              SUM(ai_sentiment = 'NEGATIVO')      AS negative,
              SUM(ai_sentiment = 'NEUTRO')        AS neutral
       FROM   pulse_entries
       WHERE  area_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
       GROUP  BY DATE(created_at)
       ORDER  BY date ASC`,
      [areaId, days]
    );

    const [areaRows] = await pool.execute('SELECT name FROM areas WHERE id = ?', [areaId]);

    res.json({
      success: true,
      data: {
        areaId,
        areaName: areaRows[0]?.name ?? `Área ${areaId}`,
        days,
        trend: rows.map((r) => ({
          date:     r.date,
          avgScore: Number(r.avgScore),
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
