import pool from '../../config/db.js';

const MANAGED_ROLES = ['Jefatura', 'RH', 'Admin'];

// ── GET /api/v1/users/me ──────────────────────────────────────────────────────
export const getMyProfile = async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      `SELECT u.id, u.name, u.email, u.position, u.hire_date,
              u.area_id, a.name AS area_name, r.name AS role
       FROM   users u
       JOIN   roles r ON u.role_id = r.id
       JOIN   areas a ON u.area_id = a.id
       WHERE  u.id = ?`,
      [req.user.id]
    );

    if (!rows.length) {
      const err = new Error('Usuario no encontrado'); err.status = 404; return next(err);
    }

    const { password_hash, ...profile } = rows[0];
    res.json({ success: true, data: profile });
  } catch (error) {
    next(error);
  }
};

// ── PUT /api/v1/users/me ──────────────────────────────────────────────────────
export const updateMyProfile = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      const err = new Error('El correo electrónico no es válido');
      err.status = 422;
      return next(err);
    }

    // Verificar que el email no esté en uso por otro usuario
    const [existing] = await pool.execute(
      'SELECT id FROM users WHERE email = ? AND id != ?',
      [email, req.user.id]
    );
    if (existing.length) {
      const err = new Error('Ese correo ya está registrado por otro usuario');
      err.status = 409;
      return next(err);
    }

    await pool.execute('UPDATE users SET email = ? WHERE id = ?', [email, req.user.id]);
    res.json({ success: true, message: 'Perfil actualizado correctamente' });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/v1/users/by-area/:areaId ────────────────────────────────────────
// Solo para Jefatura, RH y Admin — lista colaboradores de un área para el módulo de Reuniones 1:1
export const getUsersByArea = async (req, res, next) => {
  try {
    const areaId = Number(req.params.areaId);
    if (!areaId || isNaN(areaId)) {
      const err = new Error('areaId debe ser un número válido');
      err.status = 400;
      return next(err);
    }

    const [rows] = await pool.execute(
      `SELECT u.id, u.name, u.position, r.name AS role
       FROM   users u
       JOIN   roles r ON u.role_id = r.id
       WHERE  u.area_id = ?
       ORDER  BY u.name`,
      [areaId]
    );

    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/v1/users (Admin) ─────────────────────────────────────────────────
export const getAllUsers = async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      `SELECT u.id, u.name, u.email, u.position, u.hire_date,
              r.name AS role, a.name AS area_name
       FROM   users u
       JOIN   roles r ON u.role_id = r.id
       JOIN   areas a ON u.area_id = a.id
       ORDER  BY u.name`
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
};
