import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import supabase from '../../services/supabaseClient';
import { showError, showSuccess } from '../../utils/alerts';
import logo from '../../images/LogoGarnier.png';

const SetPassword = () => {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [validLink, setValidLink] = useState(false);
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setValidLink(!!data.session);
      setChecking(false);
    });
  }, []);

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (form.password.length < 8) {
      showError('Contraseña muy corta', 'Debe tener al menos 8 caracteres.');
      return;
    }
    if (form.password !== form.confirm) {
      showError('Las contraseñas no coinciden', 'Verifica que ambos campos sean iguales.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: form.password });
    setLoading(false);

    if (error) {
      showError('No se pudo completar el registro', error.message);
      return;
    }

    await supabase.auth.signOut();
    showSuccess('¡Listo!', 'Tu contraseña fue creada. Ya puedes iniciar sesión.');
    navigate('/login');
  };

  return (
    <div className="relative h-screen flex items-center justify-center bg-garnier-900 px-4 overflow-hidden">
      <motion.div
        className="absolute top-[-100px] right-[-100px] w-80 h-80 bg-brand-500 opacity-10 rounded-full"
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-[-80px] left-[-80px] w-64 h-64 bg-brand-400 opacity-10 rounded-full"
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
      />

      <motion.div
        className="w-full max-w-md relative"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <div className="text-center mb-8">
          <img src={logo} alt="Garnier & Garnier" className="h-20 w-auto object-contain mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Ecosistema Digital de Recursos Humanos</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {checking ? (
            <div className="text-center py-6 text-gray-400">
              <i className="fi fi-rr-spinner animate-spin text-2xl leading-none" />
            </div>
          ) : !validLink ? (
            <div className="text-center py-4">
              <i className="fi fi-rr-exclamation text-3xl text-red-400 leading-none block mb-3" />
              <h2 className="text-xl font-bold text-garnier-800 mb-2">Enlace inválido o vencido</h2>
              <p className="text-sm text-gray-500">
                Pide a tu administrador que reenvíe la invitación, o vuelve al login si ya tienes cuenta.
              </p>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold text-garnier-800 mb-1">Crea tu contraseña</h2>
              <p className="text-sm text-gray-500 mb-6">Último paso para activar tu cuenta de Garnier.</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="password" className="label">Nueva contraseña</label>
                  <div className="relative">
                    <i className="fi fi-rr-lock absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm leading-none" />
                    <input
                      id="password" name="password" type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password" autoFocus required
                      value={form.password} onChange={handleChange}
                      placeholder="Mínimo 8 caracteres"
                      className="input pl-9 pr-9"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm leading-none"
                    >
                      <i className={showPassword ? 'fi fi-rr-eye-crossed' : 'fi fi-rr-eye'} />
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="confirm" className="label">Confirmar contraseña</label>
                  <div className="relative">
                    <i className="fi fi-rr-lock absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm leading-none" />
                    <input
                      id="confirm" name="confirm" type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password" required
                      value={form.confirm} onChange={handleChange}
                      placeholder="Repite la contraseña"
                      className="input pl-9"
                    />
                  </div>
                </div>

                <motion.button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full py-3 text-base flex items-center justify-center gap-2 mt-2"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {loading
                    ? <><i className="fi fi-rr-spinner animate-spin leading-none" /> Guardando...</>
                    : <><i className="fi fi-rr-check leading-none" /> Activar mi cuenta</>
                  }
                </motion.button>
              </form>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default SetPassword;
