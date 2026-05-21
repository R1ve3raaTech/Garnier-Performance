import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { showSuccess, showError } from '../../utils/alerts';

const CATEGORIES = {
  logro:         { label: 'Logro',          icon: 'fi-rr-trophy',      color: 'bg-amber-100  text-amber-700'  },
  colaboracion:  { label: 'Colaboración',   icon: 'fi-rr-users',       color: 'bg-blue-100   text-blue-700'   },
  innovacion:    { label: 'Innovación',     icon: 'fi-rr-bulb',        color: 'bg-purple-100 text-purple-700' },
  liderazgo:     { label: 'Liderazgo',      icon: 'fi-rr-star',        color: 'bg-brand-100  text-brand-700'  },
  servicio:      { label: 'Servicio',       icon: 'fi-rr-heart',       color: 'bg-red-100    text-red-700'    },
  actitud:       { label: 'Actitud',        icon: 'fi-rr-face-awesome',color: 'bg-green-100  text-green-700'  },
};

// ── Modal dar reconocimiento ──────────────────────────────────────────────────
const GiveModal = ({ onClose, onCreated }) => {
  const [collaborators, setCollaborators] = useState([]);
  const [form,    setForm]    = useState({ toUserId: '', title: '', message: '', category: '', isPublic: true });
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    api.get(`/users/by-area/${user.area_id}`)
      .then((r) => setCollaborators(r.data.data.filter((u) => u.id !== user.id)))
      .catch(() => {});
  }, [user.area_id, user.id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/recognitions', { ...form, toUserId: Number(form.toUserId) });
      await showSuccess('¡Reconocimiento enviado!', 'Tu compañero/a recibirá tu reconocimiento.');
      onCreated();
      onClose();
    } catch (err) {
      showError('Error', err.response?.data?.error?.message ?? 'No se pudo enviar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center px-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !loading && onClose()} />
      <motion.div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md"
        initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}>

        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-garnier-800 flex items-center gap-2">
            <i className="fi fi-rr-trophy text-brand-500 leading-none" /> Dar reconocimiento
          </h3>
          <button onClick={onClose} disabled={loading} className="text-gray-400 hover:text-gray-600">
            <i className="fi fi-rr-cross leading-none" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="label text-xs">Para</label>
            <select required value={form.toUserId}
              onChange={(e) => setForm({ ...form, toUserId: e.target.value })} className="input text-sm">
              <option value="">— Selecciona un compañero/a —</option>
              {collaborators.map((c) => (
                <option key={c.id} value={c.id}>{c.name} · {c.position}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label text-xs">Categoría</label>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(CATEGORIES).map(([key, { label, icon, color }]) => (
                <button key={key} type="button"
                  onClick={() => setForm({ ...form, category: key })}
                  className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xl border-2 text-xs font-medium transition-all ${
                    form.category === key
                      ? `border-brand-500 ${color}`
                      : 'border-gray-200 text-gray-500 hover:border-brand-200'
                  }`}>
                  <i className={`fi ${icon} text-base leading-none`} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label text-xs">Título</label>
            <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Ej: Excelente apoyo en el proyecto" className="input text-sm" />
          </div>
          <div>
            <label className="label text-xs">Mensaje</label>
            <textarea required rows={3} value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="Describe por qué reconoces a esta persona..."
              className="input resize-none text-sm" />
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} disabled={loading} className="btn-secondary flex-1 text-sm">Cancelar</button>
            <button type="submit" disabled={loading || !form.toUserId || !form.category}
              className="btn-primary flex-1 text-sm flex items-center justify-center gap-1.5">
              {loading ? <><i className="fi fi-rr-spinner animate-spin leading-none" /> Enviando...</> : <><i className="fi fi-rr-paper-plane leading-none" /> Enviar</>}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

// ── Página principal ──────────────────────────────────────────────────────────
const Recognition = () => {
  const { user } = useAuth();
  const [feed,      setFeed]      = useState([]);
  const [mine,      setMine]      = useState([]);
  const [activeTab, setActiveTab] = useState('feed');
  const [loading,   setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [feedRes, mineRes] = await Promise.all([
        api.get('/recognitions'),
        api.get('/recognitions/mine'),
      ]);
      setFeed(feedRes.data.data ?? []);
      setMine(mineRes.data.data ?? []);
    } catch { /* silencioso */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const RecognitionCard = ({ r, showFrom = true }) => {
    const cat = CATEGORIES[r.category] ?? CATEGORIES.logro;
    return (
      <motion.div className="card hover:shadow-md transition-shadow"
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} layout>
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${cat.color}`}>
            <i className={`fi ${cat.icon} text-lg leading-none`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cat.color}`}>{cat.label}</span>
              <span className="text-xs text-gray-400">
                {new Date(r.created_at).toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
            </div>
            <p className="font-semibold text-garnier-800 text-sm">{r.title}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {showFrom ? `${r.from_name} → ` : ''}<strong className="text-garnier-800">{r.to_name ?? 'Tú'}</strong>
              {r.to_area && <span className="text-gray-400"> · {r.to_area}</span>}
            </p>
            <p className="text-sm text-gray-600 mt-2 leading-relaxed">{r.message}</p>
          </div>
        </div>
      </motion.div>
    );
  };

  const currentList = activeTab === 'feed' ? feed : mine;

  return (
    <>
      <motion.div className="p-8 max-w-2xl mx-auto"
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-1 h-7 bg-brand-500 rounded-full" />
            <div>
              <h1 className="text-2xl font-bold text-garnier-800">Reconocimientos</h1>
              <p className="text-gray-500 text-sm">Celebra los logros de tu equipo</p>
            </div>
          </div>
          <motion.button onClick={() => setShowModal(true)}
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            className="btn-primary flex items-center gap-2">
            <i className="fi fi-rr-trophy leading-none" /> Dar reconocimiento
          </motion.button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 mb-5 bg-white rounded-t-xl overflow-hidden shadow-sm">
          {[
            { id: 'feed', label: 'Feed del área',      icon: 'fi-rr-users',    count: feed.length },
            { id: 'mine', label: 'Mis reconocimientos',icon: 'fi-rr-star',     count: mine.length },
          ].map(({ id, label, icon, count }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors relative ${
                activeTab === id ? 'text-brand-600' : 'text-gray-400 hover:text-garnier-700'
              }`}>
              <i className={`fi ${icon} leading-none`} />
              {label}
              {count > 0 && <span className="text-xs bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded-full font-bold">{count}</span>}
              {activeTab === id && (
                <motion.div layoutId="rec-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-500"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }} />
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <i className="fi fi-rr-spinner animate-spin text-2xl leading-none" />
          </div>
        ) : currentList.length === 0 ? (
          <div className="card text-center py-14">
            <i className="fi fi-rr-trophy text-4xl text-gray-300 leading-none block mb-3" />
            <p className="text-gray-500 font-medium">
              {activeTab === 'feed' ? 'Aún no hay reconocimientos en el área' : 'Aún no has recibido reconocimientos'}
            </p>
            <p className="text-gray-400 text-sm mt-1">¡Sé el primero en reconocer a alguien!</p>
          </div>
        ) : (
          <AnimatePresence>
            <div className="space-y-3">
              {currentList.map((r) => (
                <RecognitionCard key={r.id} r={r} showFrom={activeTab === 'feed'} />
              ))}
            </div>
          </AnimatePresence>
        )}
      </motion.div>

      <AnimatePresence>
        {showModal && <GiveModal onClose={() => setShowModal(false)} onCreated={fetchAll} />}
      </AnimatePresence>
    </>
  );
};

export default Recognition;
