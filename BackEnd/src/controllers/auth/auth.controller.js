import supabase, { supabaseAuth } from '../../config/supabaseClient.js';

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      const err = new Error('Email y contraseña son requeridos');
      err.status = 400;
      return next(err);
    }

    const { data, error } = await supabaseAuth.auth.signInWithPassword({ email, password });

    if (error || !data.session) {
      const err = new Error('Credenciales inválidas');
      err.status = 401;
      return next(err);
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, name, email, area_id, areas(name), roles(name)')
      .eq('id', data.user.id)
      .single();

    if (profileError || !profile) {
      const err = new Error('Perfil de usuario no encontrado');
      err.status = 401;
      return next(err);
    }

    res.status(200).json({
      success: true,
      message: 'Login exitoso',
      data: {
        token: data.session.access_token,
        refreshToken: data.session.refresh_token,
        user: {
          id:        profile.id,
          name:      profile.name,
          email:     profile.email,
          role:      profile.roles?.name,
          area_id:   profile.area_id,
          area_name: profile.areas?.name,
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
    const email  = req.user.email;

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

    const { error: verifyError } = await supabaseAuth.auth.signInWithPassword({
      email, password: currentPassword,
    });
    if (verifyError) {
      const err = new Error('La contraseña actual es incorrecta');
      err.status = 401;
      return next(err);
    }

    const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
      password: newPassword,
    });
    if (updateError) {
      const err = new Error('No se pudo actualizar la contraseña');
      err.status = 500;
      return next(err);
    }

    res.json({ success: true, message: 'Contraseña actualizada correctamente' });
  } catch (error) {
    next(error);
  }
};
