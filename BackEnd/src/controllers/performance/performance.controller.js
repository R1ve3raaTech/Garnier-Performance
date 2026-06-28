import supabase from '../../config/supabaseClient.js';
import { prepare1on1Meeting } from '../../services/iaService.js';

const MANAGER_ROLES = ['Jefatura', 'RH', 'Admin'];

// ── GET /api/v1/performance/goals/:userId ─────────────────────────────────────
export const getGoalsByUser = async (req, res, next) => {
  try {
    const userId        = req.params.userId;
    const requesterId   = req.user.id;
    const requesterRole = req.user.role;

    if (!userId) {
      const err = new Error('userId debe ser un identificador válido');
      err.status = 400;
      return next(err);
    }

    if (userId !== requesterId && !MANAGER_ROLES.includes(requesterRole)) {
      const err = new Error('Solo puedes ver tus propias metas');
      err.status = 403;
      return next(err);
    }

    const { data, error } = await supabase
      .from('goals')
      .select('id, user_id, type, title, description, target_value, current_value, unit, due_date, status, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;

    const goals = data.map((g) => ({
      goalId: g.id, userId: g.user_id, type: g.type, title: g.title, description: g.description,
      targetValue: g.target_value, currentValue: g.current_value, unit: g.unit,
      dueDate: g.due_date, status: g.status, createdAt: g.created_at,
    }));

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
    if (!['OKR', 'KPI', 'MCI'].includes(type)) {
      const err = new Error('type debe ser OKR, KPI o MCI');
      err.status = 422;
      return next(err);
    }

    const { data, error } = await supabase.from('goals').insert({
      user_id: userId, type, title,
      description:   description  ?? null,
      target_value:  targetValue  ?? null,
      current_value: currentValue ?? 0,
      unit:          unit         ?? null,
      due_date:      dueDate      ?? null,
      status:        status       ?? 'PENDIENTE',
    }).select('id').single();
    if (error) throw error;

    res.status(201).json({ success: true, message: 'Meta creada correctamente', data: { goalId: data.id } });
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

    const { data: existing, error: findError } = await supabase.from('goals').select('id').eq('id', goalId);
    if (findError) throw findError;
    if (!existing.length) {
      const err = new Error('Meta no encontrada'); err.status = 404; return next(err);
    }

    const patch = {};
    if (currentValue !== undefined) patch.current_value = currentValue;
    if (status       !== undefined) patch.status        = status;
    if (title         !== undefined) patch.title         = title;
    if (description   !== undefined) patch.description   = description;
    if (targetValue   !== undefined) patch.target_value  = targetValue;
    if (dueDate        !== undefined) patch.due_date      = dueDate;

    const { error } = await supabase.from('goals').update(patch).eq('id', goalId);
    if (error) throw error;

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

    const { data: goals, error: goalsError } = await supabase
      .from('goals')
      .select('type, title, description, target_value, current_value, unit, due_date, status')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (goalsError) throw goalsError;

    const mappedGoals = goals.map((g) => ({
      type: g.type, title: g.title, description: g.description,
      targetValue: g.target_value, currentValue: g.current_value, unit: g.unit,
      dueDate: g.due_date, status: g.status,
    }));

    const { data: userRow, error: userError } = await supabase
      .from('profiles').select('name, position').eq('id', userId).single();
    if (userError || !userRow) {
      const err = new Error('Usuario no encontrado'); err.status = 404; return next(err);
    }

    const agenda = await prepare1on1Meeting(mappedGoals, pastCommitments ?? []);

    res.json({
      success: true,
      data: { employee: userRow, goalsProgress: mappedGoals, agenda },
    });
  } catch (error) {
    next(error);
  }
};
