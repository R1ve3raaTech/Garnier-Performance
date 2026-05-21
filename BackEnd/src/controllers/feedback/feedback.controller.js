import pool from '../../config/db.js';

const COMPETENCIES = ['colaboracion','comunicacion','iniciativa','calidad','adaptabilidad'];

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

    const [result] = await pool.execute(
      `INSERT INTO feedbacks (from_user_id, to_user_id, type, period, scores, comment, is_anonymous)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        fromUserId, toUserId, type,
        period ?? null,
        JSON.stringify(scores),
        comment ?? null,
        isAnonymous ? 1 : 0,
      ]
    );

    res.status(201).json({ success: true, message: 'Feedback registrado correctamente', data: { id: result.insertId } });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/v1/feedback/received ────────────────────────────────────────────
export const getReceived = async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      `SELECT f.id, f.type, f.period, f.scores, f.comment, f.is_anonymous, f.created_at,
              CASE WHEN f.is_anonymous = 1 THEN 'Anónimo' ELSE fu.name END AS from_name
       FROM   feedbacks f
       JOIN   users fu ON f.from_user_id = fu.id
       WHERE  f.to_user_id = ?
       ORDER  BY f.created_at DESC`,
      [req.user.id]
    );

    const parsed = rows.map(({ scores, ...rest }) => ({
      ...rest,
      scores: Array.isArray(scores) ? scores : (typeof scores === 'string' ? JSON.parse(scores) : scores),
    }));

    res.json({ success: true, data: parsed });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/v1/feedback/given ────────────────────────────────────────────────
export const getGiven = async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      `SELECT f.id, f.type, f.period, f.scores, f.comment, f.created_at,
              tu.name AS to_name
       FROM   feedbacks f
       JOIN   users tu ON f.to_user_id = tu.id
       WHERE  f.from_user_id = ?
       ORDER  BY f.created_at DESC`,
      [req.user.id]
    );

    const parsed = rows.map(({ scores, ...rest }) => ({
      ...rest,
      scores: Array.isArray(scores) ? scores : (typeof scores === 'string' ? JSON.parse(scores) : scores),
    }));

    res.json({ success: true, data: parsed });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/v1/feedback/team/:userId (Jefatura) ──────────────────────────────
export const getTeamFeedback = async (req, res, next) => {
  try {
    const userId = Number(req.params.userId);

    const [rows] = await pool.execute(
      `SELECT f.id, f.type, f.period, f.scores, f.comment, f.is_anonymous, f.created_at,
              CASE WHEN f.is_anonymous = 1 THEN 'Anónimo' ELSE fu.name END AS from_name
       FROM   feedbacks f
       JOIN   users fu ON f.from_user_id = fu.id
       WHERE  f.to_user_id = ?
       ORDER  BY f.created_at DESC`,
      [userId]
    );

    const parsed = rows.map(({ scores, ...rest }) => ({
      ...rest,
      scores: Array.isArray(scores) ? scores : (typeof scores === 'string' ? JSON.parse(scores) : scores),
    }));

    res.json({ success: true, data: { userId, feedbacks: parsed } });
  } catch (error) {
    next(error);
  }
};
