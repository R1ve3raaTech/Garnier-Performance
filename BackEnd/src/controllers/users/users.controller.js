import bcrypt from 'bcryptjs';
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
              r.id AS role_id, r.name AS role, a.id AS area_id, a.name AS area_name
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

// ── POST /api/v1/users (Admin) ────────────────────────────────────────────────
export const createUser = async (req, res, next) => {
  try {
    const { name, email, password, position, hire_date, role_id, area_id } = req.body;

    if (!name || !email || !password || !position || !hire_date || !role_id || !area_id) {
      const err = new Error('Todos los campos son requeridos');
      err.status = 400;
      return next(err);
    }

    if (password.length < 8) {
      const err = new Error('La contraseña debe tener al menos 8 caracteres');
      err.status = 422;
      return next(err);
    }

    const [existing] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length) {
      const err = new Error('Ese correo ya está registrado');
      err.status = 409;
      return next(err);
    }

    const password_hash = await bcrypt.hash(password, 10);
    const [result] = await pool.execute(
      `INSERT INTO users (name, email, password_hash, position, hire_date, role_id, area_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, email, password_hash, position, hire_date, role_id, area_id]
    );

    res.status(201).json({ success: true, message: 'Usuario creado correctamente', data: { id: result.insertId } });
  } catch (error) {
    next(error);
  }
};

// ── PUT /api/v1/users/:id/role (Admin) ────────────────────────────────────────
export const updateUserRole = async (req, res, next) => {
  try {
    const userId = Number(req.params.id);
    const { role_id } = req.body;

    if (!role_id) {
      const err = new Error('role_id es requerido'); err.status = 400; return next(err);
    }
    if (userId === req.user.id) {
      const err = new Error('No puedes cambiar tu propio rol'); err.status = 403; return next(err);
    }

    const [rows] = await pool.execute('SELECT id FROM users WHERE id = ?', [userId]);
    if (!rows.length) {
      const err = new Error('Usuario no encontrado'); err.status = 404; return next(err);
    }

    await pool.execute('UPDATE users SET role_id = ? WHERE id = ?', [role_id, userId]);
    res.json({ success: true, message: 'Rol actualizado correctamente' });
  } catch (error) {
    next(error);
  }
};

// ── DELETE /api/v1/users/:id (Admin) ─────────────────────────────────────────
export const deleteUser = async (req, res, next) => {
  try {
    const userId = Number(req.params.id);

    if (userId === req.user.id) {
      const err = new Error('No puedes eliminar tu propia cuenta'); err.status = 403; return next(err);
    }

    const [rows] = await pool.execute('SELECT id FROM users WHERE id = ?', [userId]);
    if (!rows.length) {
      const err = new Error('Usuario no encontrado'); err.status = 404; return next(err);
    }

    await pool.execute('DELETE FROM users WHERE id = ?', [userId]);
    res.json({ success: true, message: 'Usuario eliminado correctamente' });
  } catch (error) {
    next(error);
  }
};
