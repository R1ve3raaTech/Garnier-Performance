const checkRole = (allowedRoles) => (req, res, next) => {
  if (!req.user) {
    const err = new Error('No autenticado');
    err.status = 401;
    return next(err);
  }

  if (!allowedRoles.includes(req.user.role)) {
    const err = new Error(
      `Acceso denegado. Se requiere uno de los roles: ${allowedRoles.join(', ')}`
    );
    err.status = 403;
    return next(err);
  }

  next();
};

export default checkRole;
