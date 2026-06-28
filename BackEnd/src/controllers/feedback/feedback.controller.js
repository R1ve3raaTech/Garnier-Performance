import supabase from '../../config/supabaseClient.js';

// ── POST /api/v1/feedback ─────────────────────────────────────────────────────
export const createFeedback = async (req, res, next) => {
  try {
    const { toUserId, type, period, scores, comment, isAnonymous } = req.body;
    const fromUserId = req.user.id;

    if (!toUserId || !type || !scores) {
      const err = new Error('toUserId, type y scores son requeridos');
      err.status = 400;
      return next(err);
    }

    const validTypes = ['leader_to_collab', 'collab_to_leader', 'peer'];
    if (!validTypes.includes(type)) {
      const err = new Error(`type debe ser: ${validTypes.join(', ')}`);
      err.status = 422;
      return next(err);
    }

    const { data, error } = await supabase.from('feedbacks').insert({
      from_user_id: fromUserId, to_user_id: toUserId, type,
      period: period ?? null, scores, comment: comment ?? null,
      is_anonymous: !!isAnonymous,
    }).select('id').single();
    if (error) throw error;

    res.status(201).json({ success: true, message: 'Feedback registrado correctamente', data: { id: data.id } });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/v1/feedback/received ────────────────────────────────────────────
export const getReceived = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('feedbacks')
      .select('id, type, period, scores, comment, is_anonymous, created_at, from_user_id, profiles!feedbacks_from_user_id_fkey(name)')
      .eq('to_user_id', req.user.id)
      .order('created_at', { ascending: false });
    if (error) throw error;

    const parsed = data.map((f) => ({
      id: f.id, type: f.type, period: f.period, scores: f.scores, comment: f.comment,
      is_anonymous: f.is_anonymous, created_at: f.created_at,
      from_name: f.is_anonymous ? 'Anónimo' : f.profiles?.name,
    }));

    res.json({ success: true, data: parsed });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/v1/feedback/given ────────────────────────────────────────────────
export const getGiven = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('feedbacks')
      .select('id, type, period, scores, comment, created_at, to_user_id, profiles!feedbacks_to_user_id_fkey(name)')
      .eq('from_user_id', req.user.id)
      .order('created_at', { ascending: false });
    if (error) throw error;

    const parsed = data.map((f) => ({
      id: f.id, type: f.type, period: f.period, scores: f.scores, comment: f.comment,
      created_at: f.created_at, to_name: f.profiles?.name,
    }));

    res.json({ success: true, data: parsed });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/v1/feedback/team/:userId (Jefatura) ──────────────────────────────
export const getTeamFeedback = async (req, res, next) => {
  try {
    const userId = req.params.userId;

    const { data, error } = await supabase
      .from('feedbacks')
      .select('id, type, period, scores, comment, is_anonymous, created_at, from_user_id, profiles!feedbacks_from_user_id_fkey(name)')
      .eq('to_user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;

    const parsed = data.map((f) => ({
      id: f.id, type: f.type, period: f.period, scores: f.scores, comment: f.comment,
      is_anonymous: f.is_anonymous, created_at: f.created_at,
      from_name: f.is_anonymous ? 'Anónimo' : f.profiles?.name,
    }));

    res.json({ success: true, data: { userId, feedbacks: parsed } });
  } catch (error) {
    next(error);
  }
};
