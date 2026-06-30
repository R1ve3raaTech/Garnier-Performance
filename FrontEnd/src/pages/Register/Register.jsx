import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../../services/api';
import { showError } from '../../utils/alerts';
import logo from '../../images/LogoGarnier.png';

const Register = () => {
  const [areas,   setAreas]   = useState([]);
  const [form,    setForm]    = useState({ name: '', email: '', areaId: '', position: '' });
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);

  useEffect(() => {
    api.get('/areas').then((res) => setAreas(res.data.data ?? [])).catch(() => {});
  }, []);

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/signup', {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        areaId: Number(form.areaId),
        position: form.position.trim(),
      });
      setSent(true);
    } catch (err) {
      const msg = err.response?.data?.error?.message ?? 'No se pudo enviar la solicitud.';
      showError('No se pudo registrar', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative h-screen flex items-center justify-center bg-garnier-900 px-4 overflow-x-hidden overflow-y-auto py-8">
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
        className="w-full max-w-md relative my-auto"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <div className="text-center mb-8">
          <motion.img
            src={logo} alt="Garnier & Garnier"
            className="h-20 w-auto object-contain mx-auto mb-3"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          />
          <p className="text-gray-400 text-sm">Ecosistema Digital de Recursos Humanos</p>
        </div>

        <motion.div
          className="bg-white rounded-2xl shadow-2xl p-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          {sent ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-full bg-brand-50 flex items-center justify-center mx-auto mb-4">
                <i className="fi fi-rr-paper-plane text-2xl text-brand-500 leading-none" />
              </div>
              <h2 className="text-xl font-bold text-garnier-800 mb-2">Solicitud enviada</h2>
              <p className="text-sm text-gray-500 mb-6">
                Tu solicitud quedó en revisión. Cuando un administrador la apruebe, recibirás un correo en{' '}
                <strong>{form.email}</strong> con un enlace para crear tu contraseña.
              </p>
              <Link to="/login" className="btn-primary inline-flex items-center gap-2">
                <i className="fi fi-rr-sign-in-alt leading-none" /> Volver al login
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold text-garnier-800 mb-1">Crear cuenta</h2>
              <p className="text-sm text-gray-500 mb-6">Tu solicitud será revisada por un administrador antes de activarse.</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="name" className="label">Nombre completo</label>
                  <div className="relative">
                    <i className="fi fi-rr-user absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm leading-none" />
                    <input
                      id="name" name="name" type="text" autoFocus required
                      value={form.name} onChange={handleChange}
                      placeholder="Ana Torres"
                      className="input pl-9"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="label">Correo electrónico</label>
                  <div className="relative">
                    <i className="fi fi-rr-envelope absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm leading-none" />
                    <input
                      id="email" name="email" type="email" required
                      value={form.email} onChange={handleChange}
                      placeholder="tu@correo.com"
                      className="input pl-9"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="areaId" className="label">Área</label>
                  <div className="relative">
                    <i className="fi fi-rr-apartment absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm leading-none" />
                    <select
                      id="areaId" name="areaId" required
                      value={form.areaId} onChange={handleChange}
                      className="input pl-9 appearance-none"
                    >
                      <option value="" disabled>Selecciona tu área</option>
                      {areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="position" className="label">Puesto</label>
                  <div className="relative">
                    <i className="fi fi-rr-briefcase absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm leading-none" />
                    <input
                      id="position" name="position" type="text" required
                      value={form.position} onChange={handleChange}
                      placeholder="Developer"
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
                    ? <><i className="fi fi-rr-spinner animate-spin leading-none" /> Enviando...</>
                    : <><i className="fi fi-rr-paper-plane leading-none" /> Solicitar acceso</>
                  }
                </motion.button>
              </form>
            </>
          )}
        </motion.div>

        {!sent && (
          <p className="text-center text-gray-400 text-sm mt-6">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="text-brand-400 hover:text-brand-300 font-medium">Inicia sesión</Link>
          </p>
        )}
      </motion.div>
    </div>
  );
};

export default Register;
