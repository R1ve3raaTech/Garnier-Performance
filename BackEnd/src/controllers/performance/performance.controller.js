import pool from '../../config/db.js';
import { prepare1on1Meeting } from '../../services/iaService.js';

const MANAGER_ROLES = ['Jefatura', 'RH', 'Admin'];

// ── GET /api/v1/performance/goals/:userId ─────────────────────────────────────
// Cualquier usuario puede ver sus propias metas.
// Jefatura/RH/Admin pueden ver las de cualquier usuario.
export const getGoalsByUser = async (req, res, next) => {
  try {
    const userId      = Number(req.params.userId);
    const requesterId = req.user.id;
    const requesterRole = req.user.role;

    if (!userId || isNaN(userId)) {
      const err = new Error('userId debe ser un número válido');
      err.status = 400;
      return next(err);
    }

    if (userId !== requesterId && !MANAGER_ROLES.includes(requesterRole)) {
      const err = new Error('Solo puedes ver tus propias metas');
      err.status = 403;
      return next(err);
    }

    const [goals] = await pool.execute(
      `SELECT id AS goalId, user_id AS userId, type, title, description,
              target_value AS targetValue, current_value AS currentValue,
              unit, due_date AS dueDate, status, created_at AS createdAt
       FROM   goals
       WHERE  user_id = ?
       ORDER  BY created_at DESC`,
      [userId]
    );

    res.json({ success: true, data: { userId, totalGoals: goals.length, goals } });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/v1/performance/goals (Jefatura/RH/Admin) ───────────────────────
export const createGoal = async (req, res, next) => {
  try {
    const { userId, type, title, description, targetValue, currentValue, unit, dueDate, status } = req.body;

    if (!userId || !type || !title) {
      const err = new Error('userId, type y title son requeridos');
      err.status = 400;
      return next(err);
    }
    if (!['OKR', 'KPI'].includes(type)) {
      const err = new Error('type debe ser OKR o KPI');
      err.status = 422;
      return next(err);
    }

    const [result] = await pool.execute(
      `INSERT INTO goals (user_id, type, title, description, target_value, current_value, unit, due_date, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId, type, title,
        description  ?? null,
        targetValue  ?? null,
        currentValue ?? 0,
        unit         ?? null,
        dueDate      ?? null,
        status       ?? 'PENDIENTE',
      ]
    );

    res.status(201).json({ success: true, message: 'Meta creada correctamente', data: { goalId: result.insertId } });
  } catch (error) {
    next(error);
  }
};

// ── PUT /api/v1/performance/goals/:goalId (Jefatura/RH/Admin) ────────────────
export const updateGoal = async (req, res, next) => {
  try {
    const goalId = Number(req.params.goalId);
    const { currentValue, status, title, description, targetValue, dueDate } = req.body;

    if (!goalId || isNaN(goalId)) {
      const err = new Error('goalId debe ser un número válido');
      err.status = 400;
      return next(err);
    }

    const [existing] = await pool.execute('SELECT id FROM goals WHERE id = ?', [goalId]);
    if (!existing.length) {
      const err = new Error('Meta no encontrada'); err.status = 404; return next(err);
    }

    await pool.execute(
      `UPDATE goals SET
         current_value = COALESCE(?, current_value),
         status        = COALESCE(?, status),
         title         = COALESCE(?, title),
         description   = COALESCE(?, description),
         target_value  = COALESCE(?, target_value),
         due_date      = COALESCE(?, due_date)
       WHERE id = ?`,
      [currentValue ?? null, status ?? null, title ?? null, description ?? null, targetValue ?? null, dueDate ?? null, goalId]
    );

    res.json({ success: true, message: 'Meta actualizada correctamente' });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/v1/performance/1on1-prep ───────────────────────────────────────
export const get1on1Prep = async (req, res, next) => {
  try {
    const { userId, pastCommitments } = req.body;

    if (!userId) {
      const err = new Error('userId es requerido'); err.status = 400; return next(err);
    }

    const [goals] = await pool.execute(
      `SELECT type, title, description, target_value AS targetValue,
              current_value AS currentValue, unit, due_date AS dueDate, status
       FROM   goals WHERE user_id = ? ORDER BY created_at DESC`,
      [userId]
    );

    const [userRows] = await pool.execute(
      'SELECT name, position FROM users WHERE id = ?', [userId]
    );

    if (!userRows.length) {
      const err = new Error('Usuario no encontrado'); err.status = 404; return next(err);
    }

    const agenda = await prepare1on1Meeting(goals, pastCommitments ?? []);

    res.json({
      success: true,
      data: { employee: userRows[0], goalsProgress: goals, agenda },
    });
  } catch (error) {
    next(error);
  }
};
