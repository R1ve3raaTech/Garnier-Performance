import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Cliente separado con la anon key, solo para signInWithPassword.
// IMPORTANTE: nunca usar el cliente `supabase` (service_role) para iniciar sesión de
// usuarios — signInWithPassword muta la sesión interna del cliente y hace que las
// queries siguientes en ESE cliente se ejecuten con el token del usuario (sujeto a RLS)
// en vez del rol de servicio, afectando a todas las demás peticiones del proceso.
export const supabaseAuth = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export const testConnection = async () => {
  const { error } = await supabase.from('areas').select('id').limit(1);
  if (error) throw error;
  console.log('Supabase conectado correctamente');
};

export default supabase;
