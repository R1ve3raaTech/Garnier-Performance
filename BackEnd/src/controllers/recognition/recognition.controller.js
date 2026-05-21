import pool from '../../config/db.js';

const VALID_CATEGORIES = ['logro','colaboracion','innovacion','liderazgo','servicio','actitud'];

// ── GET /api/v1/recognitions ──────────────────────────────────────────────────
// Trae reconocimientos públicos del área del usuario (feed)
export const getFeed = async (req, res, next) => {
  try {
    const areaId = req.user.area_id;
    const limit  = Math.min(Number(req.query.limit ?? 20), 50);

    const [rows] = await pool.execute(
      `SELECT r.id, r.title, r.message, r.category, r.created_at,
              fu.name AS from_name,
              tu.name AS to_name,
              ta.name AS to_area
       FROM   recognitions r
       JOIN   users fu ON r.from_user_id = fu.id
       JOIN   users tu ON r.to_user_id   = tu.id
       JOIN   areas ta ON tu.area_id     = ta.id
       WHERE  r.is_public = 1
         AND  (fu.area_id = ? OR tu.area_id = ?)
       ORDER  BY r.created_at DESC
       LIMIT  ?`,
      [areaId, areaId, limit]
    );

    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/v1/recognitions/mine ─────────────────────────────────────────────
export const getMine = async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      `SELECT r.id, r.title, r.message, r.category, r.is_public, r.created_at,
              fu.name AS from_name
       FROM   recognitions r
       JOIN   users fu ON r.from_user_id = fu.id
       WHERE  r.to_user_id = ?
       ORDER  BY r.created_at DESC`,
      [req.user.id]
    );
    res.json({ success: true, data: rows });
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
    if (Number(toUserId) === fromUserId) {
      const err = new Error('No puedes reconocerte a ti mismo');
      err.status = 422;
      return next(err);
    }

    const [result] = await pool.execute(
      `INSERT INTO recognitions (from_user_id, to_user_id, title, message, category, is_public)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [fromUserId, toUserId, title, message, category, isPublic !== false ? 1 : 0]
    );

    res.status(201).json({
      success: true,
      message: '¡Reconocimiento enviado!',
      data: { id: result.insertId },
    });
  } catch (error) {
    next(error);
  }
};
