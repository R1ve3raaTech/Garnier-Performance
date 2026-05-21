import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { showSuccess, showError } from '../../utils/alerts';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, ResponsiveContainer, Tooltip,
} from 'recharts';

const COMPETENCIES = [
  { key: 'colaboracion', label: 'Colaboración'   },
  { key: 'comunicacion', label: 'Comunicación'   },
  { key: 'iniciativa',   label: 'Iniciativa'     },
  { key: 'calidad',      label: 'Calidad'        },
  { key: 'adaptabilidad',label: 'Adaptabilidad'  },
];

const SCORE_LABELS = { 1: 'Necesita mejorar', 2: 'En desarrollo', 3: 'Cumple', 4: 'Supera', 5: 'Excelente' };
const SCORE_COLOR  = { 1: 'bg-red-100 text-red-700', 2: 'bg-orange-100 text-orange-700',
                       3: 'bg-yellow-100 text-yellow-700', 4: 'bg-brand-100 text-brand-700',
                       5: 'bg-green-100 text-green-700' };

// ── Modal dar feedback ────────────────────────────────────────────────────────
const FeedbackModal = ({ onClose, onCreated, type }) => {
  const { user } = useAuth();
  const [collaborators, setCollaborators] = useState([]);
  const [toUserId,  setToUserId]  = useState('');
  const [period,    setPeriod]    = useState('');
  const [scores,    setScores]    = useState({});
  const [comment,   setComment]   = useState('');
  const [anonymous, setAnonymous] = useState(type === 'collab_to_leader');
  const [loading,   setLoading]   = useState(false);

  useEffect(() => {
    api.get(`/users/by-area/${user.area_id}`)
      .then((r) => setCollaborators(r.data.data.filter((u) => u.id !== user.id)))
      .catch(() => {});
  }, [user.area_id, user.id]);

  const allScored = COMPETENCIES.every((c) => scores[c.key] !== undefined);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!allScored) { showError('Completa todos los campos', 'Debes evaluar todas las competencias'); return; }
    setLoading(true);
    try {
      await api.post('/feedback', { toUserId: Number(toUserId), type, period: period || undefined, scores, comment: comment || undefined, isAnonymous: anonymous });
      await showSuccess('Feedback enviado', 'Tu evaluación ha sido registrada correctamente');
      onCreated();
      onClose();
    } catch (err) {
      showError('Error', err.response?.data?.error?.message ?? 'No se pudo enviar el feedback');
    } finally {
      setLoading(false);
    }
  };

  const TYPE_LABELS = { leader_to_collab: 'al colaborador', collab_to_leader: 'a mi líder', peer: 'a un compañero/a' };

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center px-4 overflow-y-auto py-8"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !loading && onClose()} />
      <motion.div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg my-auto"
        initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}>

        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-garnier-800 flex items-center gap-2">
            <i className="fi fi-rr-comment-check text-brand-500 leading-none" />
            Feedback {TYPE_LABELS[type]}
          </h3>
          <button onClick={onClose} disabled={loading} className="text-gray-400 hover:text-gray-600">
            <i className="fi fi-rr-cross leading-none" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label text-xs">Para</label>
              <select required value={toUserId} onChange={(e) => setToUserId(e.target.value)} className="input text-sm">
                <option value="">— Selecciona —</option>
                {collaborators.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label text-xs">Período</label>
              <input value={period} onChange={(e) => setPeriod(e.target.value)}
                placeholder="Ej: S1-2026" className="input text-sm" />
            </div>
          </div>

          <div>
            <p className="label text-xs mb-2">Evaluación de competencias (1-5)</p>
            <div className="space-y-2">
              {COMPETENCIES.map(({ key, label }) => (
                <div key={key} className="flex items-center gap-2">
                  <span className="text-xs text-gray-600 w-28 flex-shrink-0">{label}</span>
                  <div className="flex gap-1 flex-1">
                    {[1,2,3,4,5].map((v) => (
                      <button key={v} type="button"
                        onClick={() => setScores((prev) => ({ ...prev, [key]: v }))}
                        title={SCORE_LABELS[v]}
                        className={`flex-1 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                          scores[key] === v
                            ? `${SCORE_COLOR[v]} border-transparent shadow-sm`
                            : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300'
                        }`}>{v}</button>
                    ))}
                  </div>
                  {scores[key] && <span className="text-xs text-gray-400 w-20 flex-shrink-0">{SCORE_LABELS[scores[key]]}</span>}
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="label text-xs">Comentario (opcional)</label>
            <textarea rows={2} value={comment} onChange={(e) => setComment(e.target.value)}
              placeholder="Aspectos destacados, áreas de mejora..." className="input resize-none text-sm" />
          </div>

          {type === 'collab_to_leader' && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)}
                className="rounded border-gray-300 text-brand-500" />
              <span className="text-xs text-gray-600">Enviar de forma anónima</span>
            </label>
          )}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} disabled={loading} className="btn-secondary flex-1 text-sm">Cancelar</button>
            <button type="submit" disabled={loading || !toUserId || !allScored}
              className="btn-primary flex-1 text-sm flex items-center justify-center gap-1.5">
              {loading ? <><i className="fi fi-rr-spinner animate-spin leading-none" /> Enviando...</> : <><i className="fi fi-rr-check leading-none" /> Enviar feedback</>}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

// ── Card de feedback recibido ─────────────────────────────────────────────────
const FeedbackCard = ({ fb }) => {
  const radarData = COMPETENCIES.map((c) => ({
    label: c.label,
    score: fb.scores?.[c.key] ?? 0,
    fullMark: 5,
  }));

  return (
    <motion.div className="card" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} layout>
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="font-semibold text-garnier-800 text-sm">
            {fb.type === 'collab_to_leader' ? 'Feedback de colaborador' :
             fb.type === 'leader_to_collab' ? 'Feedback de jefatura' : 'Feedback de par'}
          </p>
          <p className="text-xs text-gray-400">
            De: <strong>{fb.from_name}</strong>
            {fb.period && ` · ${fb.period}`}
            {' · '}{new Date(fb.created_at).toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' })}
          </p>
        </div>
      </div>

      {radarData.some((d) => d.score > 0) && (
        <ResponsiveContainer width="100%" height={180}>
          <RadarChart data={radarData}>
            <PolarGrid stroke="#e5e7eb" />
            <PolarAngleAxis dataKey="label" tick={{ fontSize: 10, fill: '#4A4A4A' }} />
            <PolarRadiusAxis angle={90} domain={[0, 5]} tick={false} />
            <Radar dataKey="score" stroke="#8DC63F" fill="#8DC63F" fillOpacity={0.3}
              dot={{ fill: '#8DC63F', r: 3 }} />
            <Tooltip formatter={(v) => [`${v}/5`, 'Puntaje']}
              contentStyle={{ borderRadius: '8px', fontSize: '11px' }} />
          </RadarChart>
        </ResponsiveContainer>
      )}

      {fb.comment && (
        <div className="mt-2 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-600 border border-gray-100">
          <i className="fi fi-rr-comment-alt text-brand-400 mr-1 leading-none" />{fb.comment}
        </div>
      )}
    </motion.div>
  );
};

// ── Página principal ──────────────────────────────────────────────────────────
const Feedback = () => {
  const { user } = useAuth();
  const [received,  setReceived]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [modalType, setModalType] = useState(null);

  const fetchReceived = async () => {
    setLoading(true);
    try {
      const res = await api.get('/feedback/received');
      setReceived(res.data.data ?? []);
    } catch { /* silencioso */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchReceived(); }, []);

  const isManager = ['Jefatura','RH','Admin'].includes(user?.role);

  return (
    <>
      <motion.div className="p-8 max-w-2xl mx-auto"
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>

        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-1 h-7 bg-brand-500 rounded-full" />
            <div>
              <h1 className="text-2xl font-bold text-garnier-800">Feedback</h1>
              <p className="text-gray-500 text-sm">Evaluación de desempeño por competencias</p>
            </div>
          </div>

          {/* Botones según rol */}
          <div className="flex flex-col gap-2 items-end">
            {isManager && (
              <button onClick={() => setModalType('leader_to_collab')} className="btn-primary text-sm flex items-center gap-1.5">
                <i className="fi fi-rr-comment-check leading-none" /> Dar feedback
              </button>
            )}
            <button onClick={() => setModalType('collab_to_leader')} className="btn-secondary text-sm flex items-center gap-1.5">
              <i className="fi fi-rr-comment-alt leading-none" /> Feedback a mi líder
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <i className="fi fi-rr-spinner animate-spin text-2xl leading-none" />
          </div>
        ) : received.length === 0 ? (
          <div className="card text-center py-14">
            <i className="fi fi-rr-comment-check text-4xl text-gray-300 leading-none block mb-3" />
            <p className="text-gray-500 font-medium">Aún no has recibido feedback</p>
            <p className="text-gray-400 text-sm mt-1">Cuando alguien te evalúe aparecerá aquí</p>
          </div>
        ) : (
          <AnimatePresence>
            <div className="space-y-4">
              {received.map((fb) => <FeedbackCard key={fb.id} fb={fb} />)}
            </div>
          </AnimatePresence>
        )}
      </motion.div>

      <AnimatePresence>
        {modalType && (
          <FeedbackModal
            type={modalType}
            onClose={() => setModalType(null)}
            onCreated={fetchReceived}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default Feedback;
