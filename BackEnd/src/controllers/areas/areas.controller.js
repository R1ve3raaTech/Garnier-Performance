import pool from '../../config/db.js';

export const getAreas = async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, name FROM areas ORDER BY name'
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
};
