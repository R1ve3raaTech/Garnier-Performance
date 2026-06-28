import supabase from '../../config/supabaseClient.js';

// ── GET /api/v1/users/me ──────────────────────────────────────────────────────
export const getMyProfile = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, email, position, hire_date, area_id, areas(name), roles(name)')
      .eq('id', req.user.id)
      .single();

    if (error || !data) {
      const err = new Error('Usuario no encontrado'); err.status = 404; return next(err);
    }

    res.json({
      success: true,
      data: {
        id: data.id, name: data.name, email: data.email,
        position: data.position, hire_date: data.hire_date,
        area_id: data.area_id, area_name: data.areas?.name, role: data.roles?.name,
      },
    });
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

    const { data: existing } = await supabase
      .from('profiles').select('id').eq('email', email).neq('id', req.user.id);
    if (existing?.length) {
      const err = new Error('Ese correo ya está registrado por otro usuario');
      err.status = 409;
      return next(err);
    }

    const { error: authError } = await supabase.auth.admin.updateUserById(req.user.id, { email });
    if (authError) throw authError;

    const { error } = await supabase.from('profiles').update({ email }).eq('id', req.user.id);
    if (error) throw error;

    res.json({ success: true, message: 'Perfil actualizado correctamente' });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/v1/users/by-area/:areaId ────────────────────────────────────────
export const getUsersByArea = async (req, res, next) => {
  try {
    const areaId = Number(req.params.areaId);
    if (!areaId || isNaN(areaId)) {
      const err = new Error('areaId debe ser un número válido');
      err.status = 400;
      return next(err);
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, position, roles(name)')
      .eq('area_id', areaId)
      .order('name');
    if (error) throw error;

    res.json({ success: true, data: data.map((u) => ({ id: u.id, name: u.name, position: u.position, role: u.roles?.name })) });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/v1/users (Admin) ─────────────────────────────────────────────────
export const getAllUsers = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, email, position, hire_date, role_id, roles(id, name), area_id, areas(id, name)')
      .order('name');
    if (error) throw error;

    res.json({
      success: true,
      data: data.map((u) => ({
        id: u.id, name: u.name, email: u.email, position: u.position, hire_date: u.hire_date,
        role_id: u.roles?.id, role: u.roles?.name,
        area_id: u.areas?.id, area_name: u.areas?.name,
      })),
    });
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

    const { data: existing } = await supabase.from('profiles').select('id').eq('email', email);
    if (existing?.length) {
      const err = new Error('Ese correo ya está registrado');
      err.status = 409;
      return next(err);
    }

    const { data: created, error: authError } = await supabase.auth.admin.createUser({
      email, password, email_confirm: true,
    });
    if (authError) throw authError;

    const { error: profileError } = await supabase.from('profiles').insert({
      id: created.user.id, name, email, position, hire_date, role_id, area_id,
    });
    if (profileError) {
      await supabase.auth.admin.deleteUser(created.user.id);
      throw profileError;
    }

    res.status(201).json({ success: true, message: 'Usuario creado correctamente', data: { id: created.user.id } });
  } catch (error) {
    next(error);
  }
};

// ── PUT /api/v1/users/:id/role (Admin) ────────────────────────────────────────
export const updateUserRole = async (req, res, next) => {
  try {
    const userId = req.params.id;
    const { role_id } = req.body;

    if (!role_id) {
      const err = new Error('role_id es requerido'); err.status = 400; return next(err);
    }
    if (userId === req.user.id) {
      const err = new Error('No puedes cambiar tu propio rol'); err.status = 403; return next(err);
    }

    const { data: rows, error: findError } = await supabase.from('profiles').select('id').eq('id', userId);
    if (findError) throw findError;
    if (!rows.length) {
      const err = new Error('Usuario no encontrado'); err.status = 404; return next(err);
    }

    const { error } = await supabase.from('profiles').update({ role_id }).eq('id', userId);
    if (error) throw error;

    res.json({ success: true, message: 'Rol actualizado correctamente' });
  } catch (error) {
    next(error);
  }
};

// ── DELETE /api/v1/users/:id (Admin) ─────────────────────────────────────────
export const deleteUser = async (req, res, next) => {
  try {
    const userId = req.params.id;

    if (userId === req.user.id) {
      const err = new Error('No puedes eliminar tu propia cuenta'); err.status = 403; return next(err);
    }

    const { data: rows, error: findError } = await supabase.from('profiles').select('id').eq('id', userId);
    if (findError) throw findError;
    if (!rows.length) {
      const err = new Error('Usuario no encontrado'); err.status = 404; return next(err);
    }

    const { error } = await supabase.auth.admin.deleteUser(userId);
    if (error) throw error;

    res.json({ success: true, message: 'Usuario eliminado correctamente' });
  } catch (error) {
    next(error);
  }
};
