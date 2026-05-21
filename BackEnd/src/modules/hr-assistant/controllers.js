import pool from '../../config/db.js';
import { generateCompletion } from '../../services/iaService.js';
import { searchSimilarContext, buildContextBlock } from './ragService.js';
import { HR_ASSISTANT_SYSTEM_PROMPT, ESCALATION_MARKER } from './prompts.js';

// Guarda un mensaje en chat_history de forma silenciosa (no bloquea la respuesta)
const saveMessage = (userId, sessionId, role, content, extras = {}) => {
  pool.execute(
    `INSERT INTO chat_history (user_id, session_id, role, content, sources, escalated)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, sessionId, role, content,
     extras.sources ? JSON.stringify(extras.sources) : null,
     extras.escalated ? 1 : 0]
  ).catch((err) => console.error('[chat_history] Error guardando mensaje:', err.message));
};

// ── GET /api/v1/hr-assistant/health ──────────────────────────────────────────
export const healthCheck = (req, res) => {
  res.json({ success: true, message: 'HR Assistant API Operativa', timestamp: new Date().toISOString() });
};

// ── POST /api/v1/hr-assistant/query ──────────────────────────────────────────
export const processQuery = async (req, res, next) => {
  try {
    const { question, userContext, sessionId } = req.body;
    const userId = req.user.id;

    if (!question?.trim()) {
      const err = new Error('El campo question es requerido');
      err.status = 400;
      return next(err);
    }

    const chunks       = await searchSimilarContext(question);
    const contextBlock = buildContextBlock(chunks);

    const contextPrefix = userContext
      ? `CONTEXTO DEL USUARIO:
- Tema: ${userContext.topic ?? 'No especificado'}
- Urgencia: ${userContext.urgency ?? 'No especificada'}
- Tiene personas a cargo: ${userContext.isManager ? 'Sí' : 'No'}

`
      : '';

    const userPrompt = `${contextPrefix}CONTEXTO DISPONIBLE:
═══════════════════
${contextBlock}
═══════════════════

PREGUNTA DEL EMPLEADO:
${question}`;

    const { text: answer, usage } = await generateCompletion(
      userPrompt, HR_ASSISTANT_SYSTEM_PROMPT, 1024
    );

    const needsEscalation = answer.includes(ESCALATION_MARKER);
    let unresolvedId = null;

    if (needsEscalation) {
      const [result] = await pool.execute(
        `INSERT INTO unresolved_queries (user_id, question, status) VALUES (?, ?, 'pending')`,
        [userId, question]
      );
      unresolvedId = result.insertId;
      console.warn(`[ESCALACIÓN] ID: ${unresolvedId} — Usuario: ${userId}`);
    }

    // Persistir historial de forma asíncrona (no bloquea la respuesta)
    if (sessionId) {
      const sources = chunks.map((c) => ({ document: c.document, section: c.section }));
      saveMessage(userId, sessionId, 'user',      question, {});
      saveMessage(userId, sessionId, 'assistant', answer,   { sources, escalated: needsEscalation });
    }

    res.json({
      success: true,
      data: {
        question, answer,
        escalated: needsEscalation,
        ...(needsEscalation && { unresolvedQueryId: unresolvedId }),
        sources: chunks.map((c) => ({ document: c.document, section: c.section })),
        meta: { chunksRetrieved: chunks.length, tokensUsed: usage },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/v1/hr-assistant/history ─────────────────────────────────────────
// Devuelve las últimas sesiones del usuario (para recargar conversaciones)
export const getChatHistory = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const limit  = Math.min(Number(req.query.limit ?? 20), 50);

    // Última sesión del usuario
    const [sessions] = await pool.execute(
      `SELECT DISTINCT session_id, MIN(created_at) AS started_at
       FROM   chat_history
       WHERE  user_id = ?
       GROUP  BY session_id
       ORDER  BY started_at DESC
       LIMIT  5`,
      [userId]
    );

    if (!sessions.length) return res.json({ success: true, data: { sessions: [], messages: [] } });

    // Mensajes de la sesión más reciente
    const lastSession = sessions[0].session_id;
    const [messages]  = await pool.execute(
      `SELECT id, role, content, sources, escalated, created_at
       FROM   chat_history
       WHERE  user_id = ? AND session_id = ?
       ORDER  BY created_at ASC
       LIMIT  ?`,
      [userId, lastSession, limit]
    );

    const parsed = messages.map(({ sources, ...rest }) => ({
      ...rest,
      sources: sources ? (Array.isArray(sources) ? sources : JSON.parse(sources)) : [],
    }));

    res.json({ success: true, data: { sessions, lastSession, messages: parsed } });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/v1/hr-assistant/unresolved (RH/Admin) ───────────────────────────
export const getUnresolvedQueries = async (req, res, next) => {
  try {
    const status = req.query.status ?? 'pending';
    const validStatuses = ['pending', 'in_review', 'resolved'];

    if (!validStatuses.includes(status)) {
      const err = new Error(`status debe ser: ${validStatuses.join(', ')}`);
      err.status = 422;
      return next(err);
    }

    const [rows] = await pool.execute(
      `SELECT uq.id, uq.question, uq.status, uq.created_at,
              u.name  AS user_name,
              u.area_id,
              a.name  AS area_name,
              ru.name AS resolved_by_name,
              uq.resolved_at
       FROM   unresolved_queries uq
       JOIN   users u  ON uq.user_id     = u.id
       JOIN   areas a  ON u.area_id      = a.id
       LEFT JOIN users ru ON uq.resolved_by = ru.id
       WHERE  uq.status = ?
       ORDER  BY uq.created_at DESC`,
      [status]
    );

    res.json({ success: true, data: { total: rows.length, queries: rows } });
  } catch (error) {
    next(error);
  }
};

// ── PUT /api/v1/hr-assistant/unresolved/:id/resolve (RH/Admin) ───────────────
export const resolveQuery = async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    if (!id || isNaN(id)) {
      const err = new Error('id debe ser un número válido'); err.status = 400; return next(err);
    }

    const [existing] = await pool.execute(
      'SELECT id, status FROM unresolved_queries WHERE id = ?', [id]
    );
    if (!existing.length) {
      const err = new Error('Consulta no encontrada'); err.status = 404; return next(err);
    }

    await pool.execute(
      `UPDATE unresolved_queries
       SET status = 'resolved', resolved_by = ?, resolved_at = NOW()
       WHERE id = ?`,
      [req.user.id, id]
    );

    res.json({ success: true, message: 'Consulta marcada como resuelta' });
  } catch (error) {
    next(error);
  }
};

// ── PUT /api/v1/hr-assistant/unresolved/:id/status (RH/Admin) ────────────────
export const updateQueryStatus = async (req, res, next) => {
  try {
    const id     = Number(req.params.id);
    const { status } = req.body;
    const valid  = ['pending', 'in_review', 'resolved'];

    if (!valid.includes(status)) {
      const err = new Error(`status debe ser: ${valid.join(', ')}`); err.status = 422; return next(err);
    }

    const updates = status === 'resolved'
      ? `status = ?, resolved_by = ?, resolved_at = NOW()`
      : `status = ?`;

    const params = status === 'resolved'
      ? [status, req.user.id, id]
      : [status, id];

    await pool.execute(`UPDATE unresolved_queries SET ${updates} WHERE id = ?`, params);

    res.json({ success: true, message: `Consulta actualizada a: ${status}` });
  } catch (error) {
    next(error);
  }
};
