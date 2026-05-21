import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../services/api';
import { showSuccess, showError } from '../../utils/alerts';

const EMOTIONS = [
  { value: 1, label: 'Muy mal',  icon: 'fi-rr-face-disappointed', color: 'border-red-400    bg-red-50    text-red-600'    },
  { value: 2, label: 'Mal',      icon: 'fi-rr-face-sad',          color: 'border-orange-400 bg-orange-50 text-orange-600' },
  { value: 3, label: 'Regular',  icon: 'fi-rr-face-confused',     color: 'border-yellow-400 bg-yellow-50 text-yellow-600' },
  { value: 4, label: 'Bien',     icon: 'fi-rr-face-smile',        color: 'border-brand-400  bg-brand-50  text-brand-600'  },
  { value: 5, label: 'Muy bien', icon: 'fi-rr-face-awesome',      color: 'border-brand-500  bg-brand-100 text-brand-700'  },
];

const FACTORS = [
  { key: 'carga_trabajo',   label: 'Carga de trabajo', icon: 'fi-rr-briefcase'    },
  { key: 'liderazgo',       label: 'Liderazgo',        icon: 'fi-rr-star'         },
  { key: 'comunicacion',    label: 'Comunicación',     icon: 'fi-rr-megaphone'    },
  { key: 'ambiente',        label: 'Ambiente',         icon: 'fi-rr-building'     },
  { key: 'reconocimiento',  label: 'Reconocimiento',   icon: 'fi-rr-trophy'       },
  { key: 'equilibrio_vida', label: 'Equilibrio vida',  icon: 'fi-rr-balance-scale'},
  { key: 'herramientas',    label: 'Herramientas',     icon: 'fi-rr-settings'     },
  { key: 'compañerismo',    label: 'Compañerismo',     icon: 'fi-rr-users'        },
];

const PulseWork = () => {
  const [score,    setScore]    = useState(null);
  const [factors,  setFactors]  = useState([]);
  const [comment,  setComment]  = useState('');
  const [loading,  setLoading]  = useState(false);
  const [submitted,setSubmitted]= useState(false);

  const toggleFactor = (k) =>
    setFactors((prev) => prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!score || loading || submitted) return;
    setLoading(true);
    try {
      const { data } = await api.post('/pulse-work/entries', {
        emotionScore: score,
        influenceFactors: factors,
        openComment: comment || undefined,
      });

      setSubmitted(true);
      setScore(null); setFactors([]); setComment('');

      const crisis = data.data?.aiAnalysis?.crisisFlag;
      if (crisis) {
        await showError('Gracias por compartir', 'Hemos detectado que podrías estar pasando por un momento difícil. El área de RH puede apoyarte de forma confidencial.');
      } else {
        await showSuccess('¡Gracias por tu feedback!', 'Tu registro es completamente anónimo 💚');
      }
      setSubmitted(false);
    } catch {
      showError('Error', 'No se pudo registrar tu pulso. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="p-8 max-w-2xl mx-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <div className="flex items-center gap-2 mb-1">
        <div className="w-1 h-7 bg-brand-500 rounded-full" />
        <h1 className="text-2xl font-bold text-garnier-800">Mi Clima Laboral</h1>
      </div>
      <p className="text-gray-500 text-sm mb-8 ml-3">
        <i className="fi fi-rr-shield-check text-brand-500 mr-1 leading-none" />
        Tu respuesta es completamente anónima
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ── Pregunta 1: Escala emocional ────────────────────── */}
        <motion.div
          className="card"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <label className="flex items-center gap-2 text-base font-semibold text-garnier-800 mb-4">
            <i className="fi fi-rr-face-smile text-brand-500 leading-none" />
            ¿Cómo te sientes hoy?
          </label>
          <div className="flex gap-3">
            {EMOTIONS.map(({ value, label, icon, color }) => (
              <motion.button
                key={value}
                type="button"
                onClick={() => setScore(value)}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.95 }}
                className={`flex-1 flex flex-col items-center gap-2 py-4 rounded-xl border-2 transition-all duration-200 ${
                  score === value ? color : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <i className={`fi ${icon} text-3xl leading-none`} />
                <span className="text-xs font-medium">{label}</span>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* ── Pregunta 2: Factores ─────────────────────────────── */}
        <motion.div
          className="card"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <label className="flex items-center gap-2 text-base font-semibold text-garnier-800 mb-3">
            <i className="fi fi-rr-list-check text-brand-500 leading-none" />
            ¿Qué influyó hoy? <span className="font-normal text-gray-400 text-sm">(opcional)</span>
          </label>
          <div className="flex flex-wrap gap-2">
            <AnimatePresence>
              {FACTORS.map(({ key, label, icon }) => {
                const active = factors.includes(key);
                return (
                  <motion.button
                    key={key}
                    type="button"
                    onClick={() => toggleFactor(key)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      active
                        ? 'bg-brand-500 text-white border-brand-500 shadow-sm'
                        : 'bg-white text-garnier-700 border-gray-200 hover:border-brand-300'
                    }`}
                  >
                    <i className={`fi ${icon} leading-none`} />
                    {label}
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* ── Pregunta 3: Comentario ───────────────────────────── */}
        <motion.div
          className="card"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <label htmlFor="comment" className="flex items-center gap-2 text-base font-semibold text-garnier-800 mb-2">
            <i className="fi fi-rr-comment-alt text-brand-500 leading-none" />
            ¿Algo que quieras compartir? <span className="font-normal text-gray-400 text-sm">(opcional)</span>
          </label>
          <textarea
            id="comment" rows={3} value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Escribe libremente, tu comentario es anónimo..."
            className="input resize-none"
          />
        </motion.div>

        <motion.button
          type="submit"
          disabled={!score || loading || submitted}
          whileHover={score && !loading ? { scale: 1.02 } : {}}
          whileTap={score && !loading ? { scale: 0.98 } : {}}
          className="btn-primary w-full py-3 text-base flex items-center justify-center gap-2"
        >
          {loading
            ? <><i className="fi fi-rr-spinner animate-spin leading-none" /> Registrando...</>
            : <><i className="fi fi-rr-paper-plane leading-none" /> Registrar mi pulso</>
          }
        </motion.button>
      </form>
    </motion.div>
  );
};

export default PulseWork;
