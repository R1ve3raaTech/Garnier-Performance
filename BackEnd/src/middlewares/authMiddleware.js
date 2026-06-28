import supabase from '../config/supabaseClient.js';

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    const err = new Error('Token de autenticación requerido');
    err.status = 401;
    return next(err);
  }

  const token = authHeader.split(' ')[1];

  try {
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authUser) {
      const err = new Error('Token inválido o expirado');
      err.status = 401;
      return next(err);
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, name, email, position, hire_date, area_id, areas(name), roles(name)')
      .eq('id', authUser.id)
      .single();

    if (profileError || !profile) {
      const err = new Error('Perfil de usuario no encontrado');
      err.status = 401;
      return next(err);
    }

    req.user = {
      id:        profile.id,
      name:      profile.name,
      email:     profile.email,
      role:      profile.roles?.name,
      area_id:   profile.area_id,
      area_name: profile.areas?.name,
      position:  profile.position,
      hire_date: profile.hire_date,
    };
    next();
  } catch {
    const err = new Error('Token inválido o expirado');
    err.status = 401;
    next(err);
  }
};

export default authMiddleware;
