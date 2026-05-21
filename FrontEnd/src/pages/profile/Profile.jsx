import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { showSuccess, showError } from '../../utils/alerts';

// ── Utilidades ────────────────────────────────────────────────────────────────
const calcSeniority = (hireDate) => {
  if (!hireDate) return 'No registrada';
  const ms     = Date.now() - new Date(hireDate).getTime();
  const years  = Math.floor(ms / (365.25 * 24 * 3600 * 1000));
  const months = Math.floor((ms % (365.25 * 24 * 3600 * 1000)) / (30.44 * 24 * 3600 * 1000));
  if (years === 0) return months <= 1 ? 'Menos de 1 mes' : `${months} meses`;
  return `${years} año${years > 1 ? 's' : ''} ${months > 0 ? `y ${months} mes${months > 1 ? 'es' : ''}` : ''}`;
};

const MOCK_RECOGNITIONS = [
  { id: 1, title: 'Colaborador del Mes',         date: '2026-04-01', from: 'Jefatura',   icon: 'fi-rr-trophy'  },
  { id: 2, title: 'Proyecto entregado a tiempo', date: '2026-03-15', from: 'Equipo',     icon: 'fi-rr-star'    },
  { id: 3, title: 'Iniciativa de mejora',         date: '2026-02-20', from: 'RH Garnier', icon: 'fi-rr-medal'  },
];

const PREFS_KEY = 'garnier_prefs';
const DEFAULT_PREFS = {
  remindMeetings:     true,
  alertGoalsRisk:     true,
  emailNotifications: false,
  weeklyReport:       false,
};

// ── Toggle ────────────────────────────────────────────────────────────────────
const Toggle = ({ checked, onChange, label, desc }) => (
  <div className="flex items-center justify-between py-3.5 border-b border-gray-100 last:border-0">
    <div className="pr-4">
      <p className="text-sm font-medium text-garnier-800">{label}</p>
      {desc && <p className="text-xs text-gray-400 mt-0.5">{desc}</p>}
    </div>
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none ${
        checked ? 'bg-brand-500' : 'bg-gray-200'
      }`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
        checked ? 'translate-x-5' : 'translate-x-0'
      }`} />
    </button>
  </div>
);

// ── Modal contraseña ──────────────────────────────────────────────────────────
const PasswordModal = ({ onClose }) => {
  const [form,    setForm]    = useState({ current: '', next: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [fieldError, setFieldError] = useState('');

  // Evita que un clic en SweetAlert traspase al backdrop y cierre el modal
  const contentRef = useRef(null);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setFieldError(''); // limpia el error inline al tipear
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFieldError('');

    // Validaciones locales — sin borrar el formulario
    if (form.next.length < 8) {
      setFieldError('La nueva contraseña debe tener al menos 8 caracteres');
      return;
    }
    if (form.next !== form.confirm) {
      setFieldError('Las contraseñas nuevas no coinciden');
      return;
    }

    setLoading(true);
    try {
      await api.put('/auth/change-password', {
        currentPassword: form.current,
        newPassword:     form.next,
      });
      await showSuccess('¡Contraseña actualizada!', 'Tu contraseña ha sido cambiada correctamente');
      onClose();
    } catch (err) {
      const msg = err.response?.data?.error?.message ?? 'Error al cambiar la contraseña';
      setFieldError(msg); // muestra el error sin cerrar ni borrar el formulario
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      {/* Backdrop — solo cierra si no hay loading */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={() => { if (!loading) onClose(); }}
      />

      <motion.div
        ref={contentRef}
        className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm"
        initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()} // evita cierre por clic en el contenido
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-garnier-800 flex items-center gap-2">
            <i className="fi fi-rr-lock text-brand-500 leading-none" /> Cambiar contraseña
          </h3>
          <button onClick={onClose} disabled={loading} className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-40">
            <i className="fi fi-rr-cross leading-none" />
          </button>
        </div>

        {/* Error inline — sin borrar campos */}
        {fieldError && (
          <motion.div
            className="mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-xs text-red-700"
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
          >
            <i className="fi fi-rr-exclamation leading-none flex-shrink-0" />
            {fieldError}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {[
            { name: 'current', label: 'Contraseña actual',    placeholder: '••••••••'            },
            { name: 'next',    label: 'Nueva contraseña',     placeholder: 'Mínimo 8 caracteres' },
            { name: 'confirm', label: 'Confirmar contraseña', placeholder: '••••••••'            },
          ].map(({ name, label, placeholder }) => (
            <div key={name}>
              <label className="label text-xs">{label}</label>
              <div className="relative">
                <i className="fi fi-rr-lock absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs leading-none" />
                <input
                  type="password"
                  name={name}
                  required
                  placeholder={placeholder}
                  value={form[name]}
                  onChange={handleChange}
                  disabled={loading}
                  className="input pl-8 text-sm disabled:opacity-60"
                  autoComplete="new-password"
                />
              </div>
            </div>
          ))}

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} disabled={loading} className="btn-secondary flex-1 text-sm">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 text-sm flex items-center justify-center gap-1.5">
              {loading
                ? <><i className="fi fi-rr-spinner animate-spin leading-none" /> Guardando...</>
                : <><i className="fi fi-rr-check leading-none" /> Guardar</>
              }
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

// ── Página principal ──────────────────────────────────────────────────────────
const TABS = [
  { id: 'datos',  label: 'Mis Datos',    icon: 'fi-rr-user'     },
  { id: 'prefs',  label: 'Preferencias', icon: 'fi-rr-settings' },
  { id: 'logros', label: 'Mis Logros',   icon: 'fi-rr-trophy'   },
];

const Profile = () => {
  const { user, login } = useAuth();
  const [activeTab,     setActiveTab]     = useState('datos');
  const [showPassModal, setShowPassModal] = useState(false);
  const [email,         setEmail]         = useState(user?.email ?? '');
  const [savingEmail,   setSavingEmail]   = useState(false);
  const [prefs,         setPrefs]         = useState(() => {
    try { return JSON.parse(localStorage.getItem(PREFS_KEY)) ?? DEFAULT_PREFS; }
    catch { return DEFAULT_PREFS; }
  });
  const [goals,         setGoals]         = useState([]);
  const [goalsLoading,  setGoalsLoading]  = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    const fetchGoals = async () => {
      setGoalsLoading(true);
      try {
        const { data } = await api.get(`/performance/goals/${user.id}`);
        setGoals(data.data.goals ?? []);
      } catch {
        // fallo silencioso
      } finally {
        setGoalsLoading(false);
      }
    };
    fetchGoals();
  }, [user?.id]);

  const handleSaveEmail = async (e) => {
    e.preventDefault();
    setSavingEmail(true);
    try {
      await api.put('/users/me', { email });
      await showSuccess('Datos actualizados', 'Tu correo ha sido guardado correctamente');
    } catch (err) {
      showError('Error', err.response?.data?.error?.message ?? 'No se pudo actualizar el correo');
    } finally {
      setSavingEmail(false);
    }
  };

  const savePref = (key, val) => {
    const next = { ...prefs, [key]: val };
    setPrefs(next);
    localStorage.setItem(PREFS_KEY, JSON.stringify(next));
  };

  const overallProgress = goals.length > 0
    ? Math.round(goals.reduce((acc, g) => {
        const pct = g.targetValue > 0 ? Math.min(100, (g.currentValue / g.targetValue) * 100) : 0;
        return acc + pct;
      }, 0) / goals.length)
    : 0;

  const tabContent = {
    // ── Tab: Mis Datos ────────────────────────────────────────────────────
    datos: (
      <form onSubmit={handleSaveEmail} className="space-y-4">
        <div>
          <label className="label flex items-center gap-1.5">
            <i className="fi fi-rr-envelope text-brand-500 leading-none text-xs" /> Correo electrónico
          </label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input" />
        </div>

        <div>
          <label className="label flex items-center gap-1.5">
            <i className="fi fi-rr-lock text-brand-500 leading-none text-xs" /> Contraseña
          </label>
          <button type="button" onClick={() => setShowPassModal(true)}
            className="btn-secondary w-full flex items-center justify-center gap-2 text-sm">
            <i className="fi fi-rr-refresh leading-none" /> Cambiar contraseña
          </button>
        </div>

        <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg flex gap-2">
          <i className="fi fi-rr-info text-amber-500 leading-none flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">Para cambiar tu nombre, puesto o área contacta directamente al área de RH.</p>
        </div>

        <motion.button
          type="submit"
          disabled={savingEmail}
          whileHover={!savingEmail ? { scale: 1.02 } : {}}
          whileTap={!savingEmail ? { scale: 0.98 } : {}}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          {savingEmail
            ? <><i className="fi fi-rr-spinner animate-spin leading-none" /> Guardando...</>
            : <><i className="fi fi-rr-check leading-none" /> Guardar cambios</>
          }
        </motion.button>
      </form>
    ),

    // ── Tab: Preferencias ─────────────────────────────────────────────────
    prefs: (
      <div>
        <p className="text-xs text-gray-400 mb-4">Los cambios se guardan automáticamente en este dispositivo.</p>
        <Toggle checked={prefs.remindMeetings}     onChange={(v) => savePref('remindMeetings', v)}
          label="Recordatorios de reuniones 1:1"   desc="Recibir aviso 24h antes de cada sesión programada" />
        <Toggle checked={prefs.alertGoalsRisk}     onChange={(v) => savePref('alertGoalsRisk', v)}
          label="Alertas de metas en riesgo"       desc="Notificar cuando una meta esté por vencer con menos del 50% de avance" />
        <Toggle checked={prefs.emailNotifications} onChange={(v) => savePref('emailNotifications', v)}
          label="Notificaciones por correo"        desc="Recibir resumen semanal de actividad en tu bandeja" />
        <Toggle checked={prefs.weeklyReport}       onChange={(v) => savePref('weeklyReport', v)}
          label="Reporte semanal de metas"         desc="Resumen de avance de OKRs/KPIs cada lunes" />
      </div>
    ),

    // ── Tab: Mis Logros ───────────────────────────────────────────────────
    logros: (
      <div className="space-y-5">
        {/* Progreso general */}
        <div className="p-4 bg-brand-50 border border-brand-100 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-garnier-800 flex items-center gap-1.5">
              <i className="fi fi-rr-bullseye text-brand-500 leading-none" /> Avance general de metas
            </p>
            <span className="text-2xl font-black text-brand-600">{overallProgress}%</span>
          </div>
          <div className="w-full bg-white rounded-full h-3 shadow-inner">
            <motion.div className="h-3 rounded-full bg-brand-500"
              initial={{ width: 0 }} animate={{ width: `${overallProgress}%` }}
              transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }} />
          </div>
          <p className="text-xs text-brand-600 mt-1.5">{goals.length} meta{goals.length !== 1 ? 's' : ''} activa{goals.length !== 1 ? 's' : ''}</p>
        </div>

        {/* Lista de metas */}
        {goalsLoading ? (
          <p className="text-sm text-gray-400 text-center py-4">Cargando metas...</p>
        ) : goals.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Detalle por meta</p>
            {goals.map((g) => {
              const pct = g.targetValue > 0 ? Math.min(100, Math.round((g.currentValue / g.targetValue) * 100)) : 0;
              return (
                <div key={g.goalId} className="card py-3 px-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                        g.type === 'OKR' ? 'bg-garnier-800 text-white' : 'bg-brand-500 text-white'
                      }`}>{g.type}</span>
                      <p className="text-sm font-medium text-garnier-800 truncate">{g.title}</p>
                    </div>
                    <span className="text-xs font-bold text-garnier-700 flex-shrink-0 ml-2">{pct}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div className={`h-1.5 rounded-full ${pct >= 80 ? 'bg-brand-500' : pct >= 50 ? 'bg-brand-300' : 'bg-amber-400'}`}
                      style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}

        {/* Reconocimientos */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Últimos reconocimientos</p>
          <div className="space-y-2">
            {MOCK_RECOGNITIONS.map((r) => (
              <motion.div key={r.id} className="flex items-center gap-3 p-3 bg-white border border-gray-100 rounded-xl shadow-sm"
                whileHover={{ x: 4 }} transition={{ duration: 0.15 }}>
                <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                  <i className={`fi ${r.icon} text-amber-500 text-base leading-none`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-garnier-800">{r.title}</p>
                  <p className="text-xs text-gray-400">{r.from} · {new Date(r.date).toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    ),
  };

  return (
    <>
      <motion.div className="p-8 max-w-5xl mx-auto"
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>

        <div className="flex items-center gap-2 mb-6">
          <div className="w-1 h-7 bg-brand-500 rounded-full" />
          <h1 className="text-2xl font-bold text-garnier-800">Mi Perfil</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Columna izquierda ────────────────────────────────── */}
          <div className="space-y-4">
            <div className="card text-center">

              {/* Avatar con botón de foto */}
              <div className="relative inline-block mb-4">
                <div className="w-24 h-24 rounded-2xl bg-brand-500 flex items-center justify-center shadow-md mx-auto">
                  <span className="text-white font-black text-4xl leading-none">
                    {user?.name?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                  className="absolute -bottom-1 -right-1 w-7 h-7 bg-garnier-800 hover:bg-garnier-700 rounded-full flex items-center justify-center shadow transition-colors"
                  title="Cambiar foto de perfil"
                >
                  <i className="fi fi-rr-camera text-white text-xs leading-none" />
                </motion.button>
              </div>

              <h2 className="text-lg font-bold text-garnier-800">{user?.name}</h2>
              <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium mt-1 ${
                user?.role === 'RH'       ? 'bg-brand-500 text-white'    :
                user?.role === 'Jefatura' ? 'bg-brand-200 text-brand-800':
                user?.role === 'Admin'    ? 'bg-garnier-800 text-white'  :
                'bg-brand-100 text-brand-700'
              }`}>{user?.role}</span>

              {/* Datos de solo lectura */}
              <div className="mt-5 space-y-3 text-left">
                {[
                  { icon: 'fi-rr-briefcase', label: 'Puesto',     value: user?.position  ?? 'No registrado' },
                  { icon: 'fi-rr-building',  label: 'Área',       value: user?.area_name ?? 'No registrada' },
                  { icon: 'fi-rr-calendar',  label: 'Ingreso',    value: user?.hire_date
                      ? new Date(user.hire_date).toLocaleDateString('es-CR', { day: '2-digit', month: 'long', year: 'numeric' })
                      : 'No registrado' },
                  { icon: 'fi-rr-time-fast', label: 'Antigüedad', value: calcSeniority(user?.hire_date) },
                ].map(({ icon, label, value }) => (
                  <div key={label} className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-brand-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <i className={`fi ${icon} text-brand-500 text-xs leading-none`} />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">{label}</p>
                      <p className="text-sm font-medium text-garnier-800">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Nota de privacidad */}
            <div className="p-3 bg-green-50 border border-green-100 rounded-xl flex gap-2">
              <i className="fi fi-rr-shield-check text-green-500 leading-none flex-shrink-0 mt-0.5" />
              <p className="text-xs text-green-700">Tu historial de clima y encuestas eNPS es <strong>estrictamente anónimo</strong> y nunca aparecerá en tu perfil.</p>
            </div>
          </div>

          {/* ── Columna derecha con tabs ─────────────────────────── */}
          <div className="lg:col-span-2">
            <div className="card p-0 overflow-hidden">

              {/* Pestañas */}
              <div className="flex border-b border-gray-100">
                {TABS.map(({ id, label, icon }) => (
                  <button key={id} onClick={() => setActiveTab(id)}
                    className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-medium transition-colors relative ${
                      activeTab === id ? 'text-brand-600' : 'text-gray-400 hover:text-garnier-700'
                    }`}>
                    <i className={`fi ${icon} leading-none`} />
                    {label}
                    {activeTab === id && (
                      <motion.div layoutId="tab-line"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-500"
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }} />
                    )}
                  </button>
                ))}
              </div>

              {/* Contenido animado */}
              <AnimatePresence mode="wait">
                <motion.div key={activeTab} className="p-6"
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                  {tabContent[activeTab]}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {showPassModal && <PasswordModal onClose={() => setShowPassModal(false)} />}
      </AnimatePresence>
    </>
  );
};

export default Profile;
