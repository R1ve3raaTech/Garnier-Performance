import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { showError } from '../../utils/alerts';

// ── Configuración del formulario ──────────────────────────────────────────────
const STEPS = [
  { label: 'Recomendación', icon: 'fi-rr-star'       },
  { label: 'Evaluación',    icon: 'fi-rr-list-check'  },
  { label: 'Comentarios',   icon: 'fi-rr-comment-alt' },
];

const LIKERT_DIMENSIONS = [
  { key: 'leadership',    label: 'Liderazgo y jefatura directa',      icon: 'fi-rr-user-crown'   },
  { key: 'communication', label: 'Comunicación interna',              icon: 'fi-rr-megaphone'    },
  { key: 'growth',        label: 'Oportunidades de crecimiento',      icon: 'fi-rr-chart-up'     },
  { key: 'benefits',      label: 'Beneficios y compensación',         icon: 'fi-rr-sack-dollar'  },
  { key: 'environment',   label: 'Ambiente laboral y cultura',        icon: 'fi-rr-building'     },
  { key: 'balance',       label: 'Equilibrio trabajo — vida personal',icon: 'fi-rr-heart'        },
];

const LIKERT_LABELS = { 1: 'Muy malo', 2: 'Malo', 3: 'Regular', 4: 'Bueno', 5: 'Excelente' };

// Colores del score eNPS
const scoreStyle = (score, selected) => {
  if (selected !== score) return 'border-gray-200 bg-white text-gray-500 hover:border-gray-300';
  if (score <= 6) return 'border-red-500    bg-red-500    text-white shadow-md';
  if (score <= 8) return 'border-amber-400  bg-amber-400  text-white shadow-md';
  return                  'border-brand-500 bg-brand-500  text-white shadow-md';
};

// ── Barra de progreso ─────────────────────────────────────────────────────────
const Stepper = ({ current }) => (
  <div className="flex items-center gap-2 mb-8">
    {STEPS.map((s, i) => (
      <div key={i} className="flex items-center gap-2 flex-1">
        <div className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
          i <= current ? 'text-brand-600' : 'text-gray-400'
        }`}>
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
            i < current  ? 'bg-brand-500 text-white' :
            i === current ? 'bg-brand-500 text-white ring-4 ring-brand-100' :
            'bg-gray-100 text-gray-400'
          }`}>
            {i < current ? <i className="fi fi-rr-check leading-none text-[10px]" /> : i + 1}
          </div>
          <span className="hidden sm:inline">{s.label}</span>
        </div>
        {i < STEPS.length - 1 && (
          <div className={`flex-1 h-0.5 rounded-full transition-colors ${i < current ? 'bg-brand-400' : 'bg-gray-100'}`} />
        )}
      </div>
    ))}
  </div>
);

// ── Página principal ──────────────────────────────────────────────────────────
const ENPSForm = () => {
  const navigate = useNavigate();

  const [survey,     setSurvey]     = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [step,       setStep]       = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted,  setSubmitted]  = useState(false);

  // Respuestas
  const [enpsScore,   setEnpsScore]   = useState(null);
  const [likert,      setLikert]      = useState({});
  const [valued,      setValued]      = useState('');
  const [improvement, setImprovement] = useState('');

  useEffect(() => {
    api.get('/enps/surveys/active')
      .then((res) => setSurvey(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const canNext = () => {
    if (step === 0) return enpsScore !== null;
    if (step === 1) return LIKERT_DIMENSIONS.every((d) => likert[d.key] !== undefined);
    return true;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await api.post('/enps/responses', {
        surveyId:          survey.id,
        enpsScore,
        likertScores:      likert,
        valuedComment:     valued      || undefined,
        improvementComment: improvement || undefined,
      });
      setSubmitted(true);
    } catch (err) {
      showError('Error', err.response?.data?.error?.message ?? 'No se pudo registrar tu respuesta. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Estados de carga / sin encuesta ──────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <i className="fi fi-rr-spinner animate-spin text-3xl text-brand-400 leading-none" />
      </div>
    );
  }

  if (!survey) {
    return (
      <motion.div
        className="flex flex-col items-center justify-center h-full text-center px-8"
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      >
        <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
          <i className="fi fi-rr-document-signed text-4xl text-gray-300 leading-none" />
        </div>
        <h2 className="text-xl font-bold text-garnier-800 mb-2">No hay encuesta activa</h2>
        <p className="text-gray-500 text-sm max-w-sm">
          En este momento no hay ninguna encuesta eNPS abierta. Cuando RH active una nueva encuesta, aparecerá aquí.
        </p>
        <button onClick={() => navigate('/')} className="btn-secondary mt-6 flex items-center gap-2">
          <i className="fi fi-rr-arrow-left leading-none" /> Volver al inicio
        </button>
      </motion.div>
    );
  }

  // ── Estado de éxito ───────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <motion.div
        className="flex flex-col items-center justify-center h-full text-center px-8"
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
      >
        <motion.div
          className="w-24 h-24 rounded-2xl bg-brand-500 flex items-center justify-center mb-5 shadow-lg"
          initial={{ scale: 0 }} animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
        >
          <i className="fi fi-rr-check text-white text-4xl leading-none" />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <h2 className="text-2xl font-bold text-garnier-800 mb-2">¡Gracias por tu respuesta!</h2>
          <p className="text-gray-500 text-sm max-w-sm mb-1">
            Tu opinión ha sido registrada de forma completamente anónima.
          </p>
          <p className="text-gray-400 text-xs max-w-sm">
            Tus respuestas ayudan a Garnier a mejorar como lugar de trabajo para todos.
          </p>
          <button onClick={() => navigate('/')} className="btn-primary mt-6 inline-flex items-center gap-2">
            <i className="fi fi-rr-home leading-none" /> Volver al inicio
          </button>
        </motion.div>
      </motion.div>
    );
  }

  // ── Formulario ────────────────────────────────────────────────────────────────
  return (
    <motion.div
      className="p-8 max-w-2xl mx-auto"
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
    >
      {/* Header encuesta */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-1 h-7 bg-brand-500 rounded-full" />
          <h1 className="text-2xl font-bold text-garnier-800">Encuesta eNPS</h1>
        </div>
        <p className="text-gray-500 text-sm ml-3">{survey.title} · {survey.period ?? ''}</p>
      </div>

      <Stepper current={step} />

      <AnimatePresence mode="wait">

        {/* ── Step 0: eNPS Score ─────────────────────────────────────────────── */}
        {step === 0 && (
          <motion.div
            key="step0"
            className="card"
            initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.25 }}
          >
            <h2 className="text-lg font-bold text-garnier-800 mb-2">
              ¿Qué tan probable es que recomiendes Garnier & Garnier como un excelente lugar para trabajar?
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              Selecciona un número del 0 (nada probable) al 10 (muy probable).
            </p>

            {/* Grid de scores */}
            <div className="grid grid-cols-11 gap-1.5 mb-4">
              {Array.from({ length: 11 }, (_, i) => (
                <motion.button
                  key={i}
                  type="button"
                  onClick={() => setEnpsScore(i)}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className={`aspect-square rounded-xl border-2 font-bold text-sm transition-all ${scoreStyle(i, enpsScore)}`}
                >
                  {i}
                </motion.button>
              ))}
            </div>

            <div className="flex justify-between text-xs text-gray-400 mb-2">
              <span>😕 Nada probable</span>
              <span>😊 Muy probable</span>
            </div>

            {/* Leyenda de categorías */}
            <div className="flex gap-3 mt-4 flex-wrap">
              {[
                { range: '0 – 6', label: 'Detractor',  color: 'bg-red-100   text-red-700'   },
                { range: '7 – 8', label: 'Pasivo',     color: 'bg-amber-100 text-amber-700' },
                { range: '9 – 10', label: 'Promotor',  color: 'bg-brand-100 text-brand-700' },
              ].map(({ range, label, color }) => (
                <span key={label} className={`text-xs px-2 py-0.5 rounded-full font-medium ${color}`}>
                  {range} — {label}
                </span>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Step 1: Likert ──────────────────────────────────────────────────── */}
        {step === 1 && (
          <motion.div
            key="step1"
            className="card space-y-5"
            initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.25 }}
          >
            <div>
              <h2 className="text-lg font-bold text-garnier-800 mb-1">Evalúa estos aspectos de Garnier</h2>
              <p className="text-sm text-gray-500">1 = Muy malo &nbsp;·&nbsp; 5 = Excelente</p>
            </div>

            {LIKERT_DIMENSIONS.map(({ key, label, icon }) => (
              <div key={key}>
                <div className="flex items-center gap-2 mb-2">
                  <i className={`fi ${icon} text-brand-500 leading-none`} />
                  <span className="text-sm font-medium text-garnier-800">{label}</span>
                </div>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((v) => (
                    <motion.button
                      key={v}
                      type="button"
                      onClick={() => setLikert((prev) => ({ ...prev, [key]: v }))}
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.95 }}
                      title={LIKERT_LABELS[v]}
                      className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-bold transition-all ${
                        likert[key] === v
                          ? 'bg-brand-500 border-brand-500 text-white shadow-sm'
                          : 'bg-white border-gray-200 text-gray-500 hover:border-brand-300'
                      }`}
                    >
                      {v}
                    </motion.button>
                  ))}
                </div>
                {likert[key] && (
                  <p className="text-xs text-brand-600 mt-1 ml-1">{LIKERT_LABELS[likert[key]]}</p>
                )}
              </div>
            ))}
          </motion.div>
        )}

        {/* ── Step 2: Comentarios ─────────────────────────────────────────────── */}
        {step === 2 && (
          <motion.div
            key="step2"
            className="card space-y-5"
            initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.25 }}
          >
            <div>
              <h2 className="text-lg font-bold text-garnier-800 mb-1">Cuéntanos más</h2>
              <p className="text-sm text-gray-500">Tus comentarios son opcionales y completamente anónimos.</p>
            </div>

            <div>
              <label className="label flex items-center gap-1.5">
                <i className="fi fi-rr-thumbs-up text-brand-500 leading-none text-xs" />
                ¿Qué es lo que más valoras de trabajar en Garnier?
              </label>
              <textarea
                rows={3}
                value={valued}
                onChange={(e) => setValued(e.target.value)}
                placeholder="El ambiente, el liderazgo, los beneficios..."
                className="input resize-none"
              />
            </div>

            <div>
              <label className="label flex items-center gap-1.5">
                <i className="fi fi-rr-wrench text-brand-500 leading-none text-xs" />
                ¿Qué cambiarías o mejorarías?
              </label>
              <textarea
                rows={3}
                value={improvement}
                onChange={(e) => setImprovement(e.target.value)}
                placeholder="Procesos, comunicación, beneficios..."
                className="input resize-none"
              />
            </div>

            <div className="p-3 bg-green-50 border border-green-100 rounded-lg flex gap-2">
              <i className="fi fi-rr-shield-check text-green-500 leading-none flex-shrink-0 mt-0.5" />
              <p className="text-xs text-green-700">
                Tus respuestas <strong>no incluyen tu nombre ni identificación</strong>.
                Solo se procesan datos demográficos agregados (área, puesto, antigüedad).
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Navegación entre pasos ────────────────────────────────────────────── */}
      <div className="flex gap-3 mt-6">
        {step > 0 && (
          <button
            onClick={() => setStep((s) => s - 1)}
            className="btn-secondary flex items-center gap-2"
          >
            <i className="fi fi-rr-arrow-left leading-none" /> Anterior
          </button>
        )}

        {step < STEPS.length - 1 ? (
          <motion.button
            onClick={() => setStep((s) => s + 1)}
            disabled={!canNext()}
            whileHover={canNext() ? { scale: 1.02 } : {}}
            whileTap={canNext() ? { scale: 0.98 } : {}}
            className="btn-primary flex-1 flex items-center justify-center gap-2"
          >
            Siguiente <i className="fi fi-rr-arrow-right leading-none" />
          </motion.button>
        ) : (
          <motion.button
            onClick={handleSubmit}
            disabled={submitting}
            whileHover={!submitting ? { scale: 1.02 } : {}}
            whileTap={!submitting ? { scale: 0.98 } : {}}
            className="btn-primary flex-1 flex items-center justify-center gap-2"
          >
            {submitting
              ? <><i className="fi fi-rr-spinner animate-spin leading-none" /> Enviando...</>
              : <><i className="fi fi-rr-paper-plane leading-none" /> Enviar respuesta</>
            }
          </motion.button>
        )}
      </div>
    </motion.div>
  );
};

export default ENPSForm;
