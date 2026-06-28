import supabase from '../../config/supabaseClient.js';

const VALID_CATEGORIES = ['logro','colaboracion','innovacion','liderazgo','servicio','actitud'];

// ── GET /api/v1/recognitions ──────────────────────────────────────────────────
// Trae reconocimientos públicos del área del usuario (feed)
export const getFeed = async (req, res, next) => {
  try {
    const areaId = req.user.area_id;
    const limit  = Math.min(Number(req.query.limit ?? 20), 50);

    const { data, error } = await supabase
      .from('recognitions')
      .select(`
        id, title, message, category, created_at,
        from_user:profiles!recognitions_from_user_id_fkey(name, area_id),
        to_user:profiles!recognitions_to_user_id_fkey(name, area_id, areas(name))
      `)
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;

    const filtered = data
      .filter((r) => r.from_user?.area_id === areaId || r.to_user?.area_id === areaId)
      .map((r) => ({
        id: r.id, title: r.title, message: r.message, category: r.category, created_at: r.created_at,
        from_name: r.from_user?.name, to_name: r.to_user?.name, to_area: r.to_user?.areas?.name,
      }));

    res.json({ success: true, data: filtered });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/v1/recognitions/mine ─────────────────────────────────────────────
export const getMine = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('recognitions')
      .select('id, title, message, category, is_public, created_at, profiles!recognitions_from_user_id_fkey(name)')
      .eq('to_user_id', req.user.id)
      .order('created_at', { ascending: false });
    if (error) throw error;

    res.json({
      success: true,
      data: data.map((r) => ({
        id: r.id, title: r.title, message: r.message, category: r.category,
        is_public: r.is_public, created_at: r.created_at, from_name: r.profiles?.name,
      })),
    });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/v1/recognitions ─────────────────────────────────────────────────
export const createRecognition = async (req, res, next) => {
  try {
    const { toUserId, title, message, category, isPublic } = req.body;
    const fromUserId = req.user.id;

    if (!toUserId || !title?.trim() || !message?.trim() || !category) {
      const err = new Error('toUserId, title, message y category son requeridos');
      err.status = 400;
      return next(err);
    }
    if (!VALID_CATEGORIES.includes(category)) {
      const err = new Error(`category debe ser: ${VALID_CATEGORIES.join(', ')}`);
      err.status = 422;
      return next(err);
    }
    if (toUserId === fromUserId) {
      const err = new Error('No puedes reconocerte a ti mismo');
      err.status = 422;
      return next(err);
    }

    const { data, error } = await supabase.from('recognitions').insert({
      from_user_id: fromUserId, to_user_id: toUserId, title, message, category,
      is_public: isPublic !== false,
    }).select('id').single();
    if (error) throw error;

    res.status(201).json({
      success: true,
      message: '¡Reconocimiento enviado!',
      data: { id: data.id },
    });
  } catch (error) {
    next(error);
  }
};
