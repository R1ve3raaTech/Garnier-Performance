import jwt from 'jsonwebtoken';

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    const err = new Error('Token de autenticación requerido');
    err.status = 401;
    return next(err);
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, name, email, role, area_id, position, hire_date }
    next();
  } catch {
    const err = new Error('Token inválido o expirado');
    err.status = 401;
    next(err);
  }
};

export default authMiddleware;
