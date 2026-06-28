import supabase from '../../config/supabaseClient.js';
import { generateCompletion } from '../../services/iaService.js';
import { searchSimilarContext, buildContextBlock } from './ragService.js';
import { HR_ASSISTANT_SYSTEM_PROMPT, ESCALATION_MARKER } from './prompts.js';

// Guarda un mensaje en chat_history de forma silenciosa (no bloquea la respuesta)
const saveMessage = (userId, sessionId, role, content, extras = {}) => {
  supabase.from('chat_history').insert({
    user_id: userId, session_id: sessionId, role, content,
    sources: extras.sources ?? null, escalated: !!extras.escalated,
  }).then(({ error }) => {
    if (error) console.error('[chat_history] Error guardando mensaje:', error.message);
  });
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
      const { data, error } = await supabase.from('unresolved_queries').insert({
        user_id: userId, question, status: 'pending',
      }).select('id').single();
      if (error) throw error;
      unresolvedId = data.id;
      console.warn(`[ESCALACIÓN] ID: ${unresolvedId} — Usuario: ${userId}`);
    }

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
export const getChatHistory = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const limit  = Math.min(Number(req.query.limit ?? 20), 50);

    const { data: allMessages, error: sessionsError } = await supabase
      .from('chat_history')
      .select('session_id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (sessionsError) throw sessionsError;

    if (!allMessages.length) return res.json({ success: true, data: { sessions: [], messages: [] } });

    const sessionStarts = new Map();
    allMessages.forEach((m) => {
      if (!sessionStarts.has(m.session_id) || m.created_at < sessionStarts.get(m.session_id)) {
        sessionStarts.set(m.session_id, m.created_at);
      }
    });
    const sessions = Array.from(sessionStarts.entries())
      .map(([session_id, started_at]) => ({ session_id, started_at }))
      .sort((a, b) => new Date(b.started_at) - new Date(a.started_at))
      .slice(0, 5);

    const lastSession = sessions[0].session_id;
    const { data: messages, error: messagesError } = await supabase
      .from('chat_history')
      .select('id, role, content, sources, escalated, created_at')
      .eq('user_id', userId)
      .eq('session_id', lastSession)
      .order('created_at', { ascending: true })
      .limit(limit);
    if (messagesError) throw messagesError;

    const parsed = messages.map((m) => ({ ...m, sources: m.sources ?? [] }));

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

    const { data, error } = await supabase
      .from('unresolved_queries')
      .select(`
        id, question, status, created_at, resolved_at,
        user:profiles!unresolved_queries_user_id_fkey(name, area_id, areas(name)),
        resolver:profiles!unresolved_queries_resolved_by_fkey(name)
      `)
      .eq('status', status)
      .order('created_at', { ascending: false });
    if (error) throw error;

    const rows = data.map((q) => ({
      id: q.id, question: q.question, status: q.status, created_at: q.created_at,
      user_name: q.user?.name, area_id: q.user?.area_id, area_name: q.user?.areas?.name,
      resolved_by_name: q.resolver?.name, resolved_at: q.resolved_at,
    }));

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

    const { data: existing, error: findError } = await supabase
      .from('unresolved_queries').select('id').eq('id', id);
    if (findError) throw findError;
    if (!existing.length) {
      const err = new Error('Consulta no encontrada'); err.status = 404; return next(err);
    }

    const { error } = await supabase.from('unresolved_queries').update({
      status: 'resolved', resolved_by: req.user.id, resolved_at: new Date().toISOString(),
    }).eq('id', id);
    if (error) throw error;

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

    const patch = status === 'resolved'
      ? { status, resolved_by: req.user.id, resolved_at: new Date().toISOString() }
      : { status };

    const { error } = await supabase.from('unresolved_queries').update(patch).eq('id', id);
    if (error) throw error;

    res.json({ success: true, message: `Consulta actualizada a: ${status}` });
  } catch (error) {
    next(error);
  }
};
