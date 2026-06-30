import supabase from '../../config/supabaseClient.js';

const FRONTEND_URL = process.env.FRONTEND_URL ?? (process.env.ALLOWED_ORIGINS ?? '').split(',')[0];

// ── POST /api/v1/signup ───────────────────────────────────────────────────────
// Público — cualquiera puede solicitar una cuenta, queda en revisión de Admin.
// Área, puesto y rol los asigna el Admin al momento de aprobar.
export const requestSignup = async (req, res, next) => {
  try {
    const { name, email } = req.body;

    if (!name?.trim() || !email?.trim()) {
      const err = new Error('name y email son requeridos');
      err.status = 400;
      return next(err);
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      const err = new Error('El correo electrónico no es válido');
      err.status = 422;
      return next(err);
    }

    const normalizedEmail = email.trim().toLowerCase();

    const { data: existingProfile } = await supabase
      .from('profiles').select('id').eq('email', normalizedEmail).maybeSingle();
    if (existingProfile) {
      const err = new Error('Ya existe una cuenta activa con ese correo');
      err.status = 409;
      return next(err);
    }

    const { data: existingRequest } = await supabase
      .from('signup_requests').select('id, status').eq('email', normalizedEmail).in('status', ['pending', 'approved']).maybeSingle();
    if (existingRequest) {
      const err = new Error('Ya existe una solicitud en revisión o aprobada con ese correo');
      err.status = 409;
      return next(err);
    }

    const { data, error } = await supabase.from('signup_requests').insert({
      name: name.trim(), email: normalizedEmail,
    }).select('id').single();
    if (error) throw error;

    res.status(201).json({
      success: true,
      message: 'Tu solicitud fue enviada y quedó en revisión. Te avisaremos por correo cuando sea aprobada.',
      data: { id: data.id },
    });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/v1/signup/requests (Admin) ──────────────────────────────────────
export const listRequests = async (req, res, next) => {
  try {
    const status = req.query.status ?? 'pending';
    const valid  = ['pending', 'approved', 'rejected'];
    if (!valid.includes(status)) {
      const err = new Error(`status debe ser: ${valid.join(', ')}`); err.status = 422; return next(err);
    }

    const { data, error } = await supabase
      .from('signup_requests')
      .select('id, name, email, position, status, created_at, reviewed_at, areas(id, name), reviewer:profiles!signup_requests_reviewed_by_fkey(name)')
      .eq('status', status)
      .order('created_at', { ascending: false });
    if (error) throw error;

    res.json({
      success: true,
      data: data.map((r) => ({
        id: r.id, name: r.name, email: r.email, position: r.position, status: r.status,
        created_at: r.created_at, reviewed_at: r.reviewed_at,
        area_id: r.areas?.id, area_name: r.areas?.name, reviewed_by_name: r.reviewer?.name,
      })),
    });
  } catch (error) {
    next(error);
  }
};

// ── PUT /api/v1/signup/requests/:id/approve (Admin) ──────────────────────────
// El Admin define rol, área y puesto al aprobar — el solicitante no los elige.
export const approveRequest = async (req, res, next) => {
  try {
    const id     = Number(req.params.id);
    const { roleId, areaId, position } = req.body;

    if (!roleId || !areaId || !position?.trim()) {
      const err = new Error('roleId, areaId y position son requeridos para aprobar');
      err.status = 400;
      return next(err);
    }

    const [{ data: validRole }, { data: validArea }] = await Promise.all([
      supabase.from('roles').select('id').eq('id', roleId).maybeSingle(),
      supabase.from('areas').select('id').eq('id', areaId).maybeSingle(),
    ]);
    if (!validRole) {
      const err = new Error('roleId no corresponde a un rol válido'); err.status = 422; return next(err);
    }
    if (!validArea) {
      const err = new Error('areaId no corresponde a un área válida'); err.status = 422; return next(err);
    }

    // Update atómico condicionado a status='pending': si dos admins aprueban a la vez,
    // solo uno obtiene una fila de vuelta — el otro recibe "ya fue procesada".
    const { data: claimed, error: claimError } = await supabase
      .from('signup_requests')
      .update({ status: 'approved', role_id: roleId, area_id: areaId, position: position.trim(),
                 reviewed_by: req.user.id, reviewed_at: new Date().toISOString() })
      .eq('id', id).eq('status', 'pending')
      .select('*')
      .maybeSingle();
    if (claimError) throw claimError;
    if (!claimed) {
      const err = new Error('Solicitud no encontrada o ya fue procesada'); err.status = 404; return next(err);
    }

    const { data: invited, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(claimed.email, {
      redirectTo: `${FRONTEND_URL}/set-password`,
    });
    if (inviteError) {
      // Revertir el estado para que la solicitud pueda reintentarse
      await supabase.from('signup_requests').update({ status: 'pending', reviewed_by: null, reviewed_at: null }).eq('id', id);
      throw inviteError;
    }

    const { error: profileError } = await supabase.from('profiles').insert({
      id: invited.user.id, name: claimed.name, email: claimed.email,
      role_id: roleId, area_id: areaId, position: position.trim(),
      hire_date: new Date().toISOString().slice(0, 10),
    });
    if (profileError) {
      await supabase.auth.admin.deleteUser(invited.user.id);
      await supabase.from('signup_requests').update({ status: 'pending', reviewed_by: null, reviewed_at: null }).eq('id', id);
      throw profileError;
    }

    res.json({ success: true, message: `Solicitud aprobada. Se envió una invitación a ${claimed.email}.` });
  } catch (error) {
    next(error);
  }
};

// ── PUT /api/v1/signup/requests/:id/reject (Admin) ───────────────────────────
export const rejectRequest = async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    const { data: request, error: findError } = await supabase
      .from('signup_requests').select('id').eq('id', id).eq('status', 'pending').single();
    if (findError || !request) {
      const err = new Error('Solicitud no encontrada o ya fue procesada'); err.status = 404; return next(err);
    }

    const { error } = await supabase.from('signup_requests').update({
      status: 'rejected', reviewed_by: req.user.id, reviewed_at: new Date().toISOString(),
    }).eq('id', id);
    if (error) throw error;

    res.json({ success: true, message: 'Solicitud rechazada' });
  } catch (error) {
    next(error);
  }
};
