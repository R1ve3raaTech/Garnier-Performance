import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../../config/db.js';

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      const err = new Error('Email y contraseña son requeridos');
      err.status = 400;
      return next(err);
    }

    const [rows] = await pool.execute(
      `SELECT u.id, u.name, u.email, u.password_hash,
              u.area_id, u.position, u.hire_date,
              r.name AS role,
              a.name AS area_name
       FROM   users u
       JOIN   roles r ON u.role_id = r.id
       JOIN   areas a ON u.area_id = a.id
       WHERE  u.email = ?
       LIMIT  1`,
      [email]
    );

    if (rows.length === 0) {
      const err = new Error('Credenciales inválidas');
      err.status = 401;
      return next(err);
    }

    const user = rows[0];
    const passwordValid = await bcrypt.compare(password, user.password_hash);

    if (!passwordValid) {
      const err = new Error('Credenciales inválidas');
      err.status = 401;
      return next(err);
    }

    const payload = {
      id:        user.id,
      name:      user.name,
      email:     user.email,
      role:      user.role,
      area_id:   user.area_id,
      area_name: user.area_name,
      position:  user.position,
      hire_date: user.hire_date,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '8h',
    });

    res.status(200).json({
      success: true,
      message: 'Login exitoso',
      data: {
        token,
        user: {
          id:        user.id,
          name:      user.name,
          email:     user.email,
          role:      user.role,
          area_id:   user.area_id,
          area_name: user.area_name,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newPassword) {
      const err = new Error('currentPassword y newPassword son requeridos');
      err.status = 400;
      return next(err);
    }

    if (newPassword.length < 8) {
      const err = new Error('La nueva contraseña debe tener al menos 8 caracteres');
      err.status = 422;
      return next(err);
    }

    const [rows] = await pool.execute(
      'SELECT password_hash FROM users WHERE id = ?', [userId]
    );

    if (!rows.length) {
      const err = new Error('Usuario no encontrado'); err.status = 404; return next(err);
    }

    const valid = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!valid) {
      const err = new Error('La contraseña actual es incorrecta');
      err.status = 401;
      return next(err);
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await pool.execute('UPDATE users SET password_hash = ? WHERE id = ?', [hash, userId]);

    res.json({ success: true, message: 'Contraseña actualizada correctamente' });
  } catch (error) {
    next(error);
  }
};
