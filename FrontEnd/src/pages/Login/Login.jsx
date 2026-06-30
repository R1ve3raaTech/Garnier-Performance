import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { showError } from '../../utils/alerts';
import logo from '../../images/LogoGarnier.png';

const Login = () => {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const [form,    setForm]    = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login({ ...form, email: form.email.trim().toLowerCase() });
      navigate('/');
    } catch (err) {
      const msg = err.response?.data?.error?.message ?? 'Credenciales incorrectas';
      setLoading(false); // primero apaga el loading
      showError('Acceso denegado', msg); // sin await — SweetAlert abre de forma independiente, no toca el formulario
    }
  };

  return (
    <div className="relative h-screen flex items-center justify-center bg-garnier-900 px-4 overflow-hidden">

      {/* Burbujas decorativas */}
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
        {/* Logo */}
        <div className="text-center mb-8">
          <motion.img
            src={logo}
            alt="Garnier & Garnier"
            className="h-20 w-auto object-contain mx-auto mb-3"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          />
          <p className="text-gray-400 text-sm">Ecosistema Digital de Recursos Humanos</p>
        </div>

        {/* Card */}
        <motion.div
          className="bg-white rounded-2xl shadow-2xl p-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <h2 className="text-xl font-bold text-garnier-800 mb-6">Iniciar sesión</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="label">Correo electrónico</label>
              <div className="relative">
                <i className="fi fi-rr-envelope absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm leading-none" />
                <input
                  id="email" name="email" type="email"
                  autoComplete="email" autoFocus required
                  value={form.email} onChange={handleChange}
                  placeholder="usuario@garnier.com"
                  className="input pl-9"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="label">Contraseña</label>
              <div className="relative">
                <i className="fi fi-rr-lock absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm leading-none" />
                <input
                  id="password" name="password" type={showPassword ? 'text' : 'password'}
                  autoComplete="off" required
                  value={form.password} onChange={handleChange}
                  placeholder="••••••••"
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

            <p className="text-xs text-gray-400 -mt-1">
              ¿No puedes ingresar? Contacta a tu equipo de RH para restablecer tu acceso.
            </p>

            <motion.button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 text-base flex items-center justify-center gap-2 mt-2"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {loading
                ? <><i className="fi fi-rr-spinner animate-spin leading-none" /> Ingresando...</>
                : <><i className="fi fi-rr-sign-in-alt leading-none" /> Ingresar</>
              }
            </motion.button>
          </form>
        </motion.div>

        <p className="text-center text-gray-500 text-xs mt-6">
          © {new Date().getFullYear()} Garnier & Garnier — Acceso restringido a colaboradores
        </p>
      </motion.div>
    </div>
  );
};

export default Login;
