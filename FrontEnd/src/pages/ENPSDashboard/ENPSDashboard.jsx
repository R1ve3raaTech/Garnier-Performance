import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell,
  ResponsiveContainer, Tooltip,
} from 'recharts';
import api from '../../services/api';
import { showError } from '../../utils/alerts';

const enpsColor = (score) =>
  score >= 50 ? 'text-green-600' : score >= 0 ? 'text-amber-500' : 'text-red-600';

const enpsBarColor = (score) =>
  score >= 50 ? '#8DC63F' : score >= 0 ? '#f59e0b' : '#ef4444';

const DASHBOARD_TABS = [
  { id: 'global',    label: 'Global',     icon: 'fi-rr-chart-line-up'  },
  { id: 'segmented', label: 'Segmentado', icon: 'fi-rr-chart-histogram'},
];

const ENPSDashboard = () => {
  const [surveys,        setSurveys]        = useState([]);
  const [surveyId,       setSurveyId]       = useState(null);
  const [data,           setData]           = useState(null);
  const [likertData,     setLikertData]     = useState([]);
  const [segmented,      setSegmented]      = useState(null);
  const [activeTab,      setActiveTab]      = useState('global');
  const [loading,        setLoading]        = useState(false);
  const [exporting,      setExporting]      = useState(false);
  const [loadingSurveys, setLoadingSurveys] = useState(true);

  // Cargar lista de encuestas y preseleccionar la activa
  useEffect(() => {
    const fetchSurveys = async () => {
      try {
        const res = await api.get('/enps/surveys');
        const list = res.data.data ?? [];
        setSurveys(list);
        const active = list.find((s) => s.status === 'active');
        if (active) setSurveyId(active.id);
        else if (list.length) setSurveyId(list[0].id);
      } catch {
        showError('Error', 'No se pudo cargar la lista de encuestas');
      } finally {
        setLoadingSurveys(false);
      }
    };
    fetchSurveys();
  }, []);

  const fetchSummary = async () => {
    if (!surveyId) return;
    setLoading(true); setData(null); setLikertData([]); setSegmented(null);
    try {
      const [summaryRes, likertRes, segmentedRes] = await Promise.all([
        api.get(`/enps/dashboard/executive-summary/${surveyId}`),
        api.get(`/enps/dashboard/likert-breakdown/${surveyId}`),
        api.get(`/enps/dashboard/segmented/${surveyId}`),
      ]);
      setData(summaryRes.data.data);
      setLikertData(likertRes.data.data ?? []);
      setSegmented(segmentedRes.data.data ?? null);
    } catch (err) {
      showError('Error', err.response?.data?.error?.message ?? 'Error al cargar el resumen');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!surveyId) return;
    setExporting(true);
    try {
      const res = await api.get(`/enps/export/${surveyId}`, { responseType: 'blob' });
      const url  = URL.createObjectURL(res.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `eNPS-${surveyId}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      showError('Error', 'No se pudo exportar el archivo Excel');
    } finally {
      setExporting(false);
    }
  };

  const selectedSurvey = surveys.find((s) => s.id === surveyId);

  return (
    <motion.div
      className="p-8 max-w-3xl mx-auto"
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
    >
      <div className="flex items-center gap-2 mb-1">
        <div className="w-1 h-7 bg-brand-500 rounded-full" />
        <h1 className="text-2xl font-bold text-garnier-800">Dashboard eNPS</h1>
      </div>
      <p className="text-gray-500 text-sm mb-6">Resumen ejecutivo generado con IA</p>

      {/* Selector de encuesta */}
      <div className="card mb-6 space-y-3">
        <label className="label flex items-center gap-1.5">
          <i className="fi fi-rr-chart-line-up text-brand-500 text-xs leading-none" /> Encuesta
        </label>

        {loadingSurveys ? (
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <i className="fi fi-rr-spinner animate-spin leading-none" /> Cargando encuestas...
          </div>
        ) : surveys.length === 0 ? (
          <p className="text-sm text-gray-400">No hay encuestas creadas aún.</p>
        ) : (
          <div className="flex gap-3">
            <select
              value={surveyId ?? ''}
              onChange={(e) => { setSurveyId(Number(e.target.value)); setData(null); }}
              className="input flex-1"
            >
              {surveys.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title} — {s.period ?? 'Sin período'}
                  {s.status === 'active' ? ' ✓ Activa' : s.status === 'closed' ? ' (Cerrada)' : ' (Borrador)'}
                </option>
              ))}
            </select>
            <motion.button
              onClick={fetchSummary}
              disabled={loading || !surveyId}
              whileHover={!loading ? { scale: 1.02 } : {}}
              whileTap={!loading ? { scale: 0.98 } : {}}
              className="btn-primary flex items-center gap-2 whitespace-nowrap"
            >
              {loading
                ? <><i className="fi fi-rr-spinner animate-spin leading-none" /> Cargando...</>
                : <><i className="fi fi-rr-search leading-none" /> Ver resumen</>
              }
            </motion.button>
          </div>
        )}

        {selectedSurvey && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className={`px-2 py-0.5 rounded-full font-medium ${
              selectedSurvey.status === 'active'  ? 'bg-brand-100 text-brand-700' :
              selectedSurvey.status === 'closed'  ? 'bg-gray-100 text-gray-500'  :
              'bg-amber-100 text-amber-700'
            }`}>
              {selectedSurvey.status === 'active' ? 'Activa' : selectedSurvey.status === 'closed' ? 'Cerrada' : 'Borrador'}
            </span>
            {selectedSurvey.response_count > 0 && (
              <span>{selectedSurvey.response_count} respuesta{selectedSurvey.response_count !== 1 ? 's' : ''}</span>
            )}
            {selectedSurvey.start_date && (
              <span>
                {new Date(selectedSurvey.start_date).toLocaleDateString('es-CR', { day: '2-digit', month: 'short' })}
                {selectedSurvey.end_date && ` → ${new Date(selectedSurvey.end_date).toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' })}`}
              </span>
            )}
          </div>
        )}
      </div>

      {data && (
        <motion.div
          className="space-y-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}
        >
          {/* Tabs Global / Segmentado */}
          <div className="flex border-b border-gray-100 bg-white rounded-t-xl overflow-hidden shadow-sm">
            {DASHBOARD_TABS.map(({ id, label, icon }) => (
              <button key={id} onClick={() => setActiveTab(id)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors relative ${
                  activeTab === id ? 'text-brand-600' : 'text-gray-400 hover:text-garnier-700'
                }`}>
                <i className={`fi ${icon} leading-none`} />
                {label}
                {activeTab === id && (
                  <motion.div layoutId="enps-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-500"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }} />
                )}
              </button>
            ))}
          </div>
          {/* ── Vista segmentada ─────────────────────────────── */}
          {activeTab === 'segmented' && segmented && (
            <AnimatePresence mode="wait">
              <motion.div key="segmented" className="space-y-4"
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>

                {/* Por área */}
                {segmented.byArea?.length > 0 && (
                  <div className="card">
                    <h3 className="font-semibold text-garnier-800 mb-4 flex items-center gap-2">
                      <i className="fi fi-rr-building text-brand-500 leading-none" /> eNPS por área
                    </h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={segmented.byArea} margin={{ top: 5, right: 10, left: -20, bottom: 30 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                        <XAxis dataKey="segment" tick={{ fontSize: 10, fill: '#4A4A4A' }} angle={-20} textAnchor="end" interval={0} />
                        <YAxis domain={[-100, 100]} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                        <Tooltip formatter={(v) => [`${v}`, 'eNPS Score']}
                          contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                        <Bar dataKey="enpsScore" radius={[4,4,0,0]}>
                          {segmented.byArea.map((entry, i) => (
                            <Cell key={i} fill={enpsBarColor(entry.enpsScore)} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="space-y-2 mt-2">
                      {segmented.byArea.map((s) => (
                        <div key={s.segment} className="flex items-center justify-between text-sm">
                          <span className="text-garnier-800 font-medium">{s.segment}</span>
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            <span>{s.total} resp.</span>
                            <span className="text-green-600">{s.promotersPct}% P</span>
                            <span className="text-red-500">{s.detractorsPct}% D</span>
                            <span className={`font-bold ${enpsColor(s.enpsScore)}`}>{s.enpsScore}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Por antigüedad */}
                {segmented.bySeniority?.length > 0 && (
                  <div className="card">
                    <h3 className="font-semibold text-garnier-800 mb-4 flex items-center gap-2">
                      <i className="fi fi-rr-time-fast text-brand-500 leading-none" /> eNPS por antigüedad
                    </h3>
                    <div className="space-y-3">
                      {segmented.bySeniority.map((s) => (
                        <div key={s.segment}>
                          <div className="flex items-center justify-between mb-1 text-sm">
                            <span className="font-medium text-garnier-800">{s.segment}</span>
                            <span className={`font-black ${enpsColor(s.enpsScore)}`}>{s.enpsScore}</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2">
                            <div className="h-2 rounded-full transition-all"
                              style={{ width: `${Math.max(0, s.promotersPct)}%`, backgroundColor: enpsBarColor(s.enpsScore) }} />
                          </div>
                          <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                            <span>{s.total} respuestas</span>
                            <span>{s.promotersPct}% promotores · {s.detractorsPct}% detractores</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          )}

          {/* ── Vista global ──────────────────────────────────── */}
          {activeTab === 'global' && (
          <>
          {/* Score principal */}
          {data.stats && (
            <div className="card text-center">
              <p className={`text-7xl font-black ${enpsColor(data.stats.enpsScore)}`}>
                {data.stats.enpsScore}
              </p>
              <p className="text-gray-500 text-sm mt-1 font-medium">
                eNPS Score — {data.stats.total} respuesta{data.stats.total !== 1 ? 's' : ''}
              </p>

              <div className="flex justify-center gap-8 mt-5">
                {[
                  { label: 'Promotores',  value: data.stats.promotersPct,  color: 'text-green-600',  bar: 'bg-green-500'  },
                  { label: 'Pasivos',     value: data.stats.passivesPct,   color: 'text-amber-500',  bar: 'bg-amber-400'  },
                  { label: 'Detractores', value: data.stats.detractorsPct, color: 'text-red-500',    bar: 'bg-red-500'    },
                ].map(({ label, value, color, bar }) => (
                  <div key={label} className="text-center">
                    <p className={`text-2xl font-black ${color}`}>{value}%</p>
                    <div className="w-16 bg-gray-100 rounded-full h-1.5 mx-auto mt-1 mb-1">
                      <motion.div
                        className={`h-1.5 rounded-full ${bar}`}
                        initial={{ width: 0 }} animate={{ width: `${value}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
                      />
                    </div>
                    <p className="text-gray-400 text-xs">{label}</p>
                  </div>
                ))}
              </div>

              {data.stats.avgLikert !== 'N/A' && (
                <p className="text-xs text-gray-400 mt-3">
                  Promedio Likert general: <strong className="text-garnier-800">{data.stats.avgLikert}/5</strong>
                </p>
              )}
            </div>
          )}

          {/* Resumen ejecutivo IA */}
          {data.aiSummary?.overallAssessment && (
            <div className="card bg-brand-50 border-brand-100">
              <h3 className="font-semibold text-brand-800 mb-2 flex items-center gap-2">
                <i className="fi fi-rr-robot text-brand-500 leading-none" /> Análisis ejecutivo
              </h3>
              <p className="text-sm text-brand-700 leading-relaxed">{data.aiSummary.overallAssessment}</p>
            </div>
          )}

          {/* Temas positivos y de mejora */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.aiSummary?.positiveThemes?.length > 0 && (
              <div className="card">
                <h3 className="font-semibold text-green-700 mb-3 text-sm flex items-center gap-1.5">
                  <i className="fi fi-rr-thumbs-up leading-none" /> Lo que valoran
                </h3>
                <ul className="space-y-1.5">
                  {data.aiSummary.positiveThemes.map((t, i) => (
                    <li key={i} className="text-sm text-gray-600 flex gap-2">
                      <i className="fi fi-rr-check text-brand-500 leading-none flex-shrink-0 mt-0.5" /> {t}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {data.aiSummary?.improvementThemes?.length > 0 && (
              <div className="card">
                <h3 className="font-semibold text-amber-700 mb-3 text-sm flex items-center gap-1.5">
                  <i className="fi fi-rr-wrench leading-none" /> Áreas de mejora
                </h3>
                <ul className="space-y-1.5">
                  {data.aiSummary.improvementThemes.map((t, i) => (
                    <li key={i} className="text-sm text-gray-600 flex gap-2">
                      <i className="fi fi-rr-angle-right text-amber-400 leading-none flex-shrink-0 mt-0.5" /> {t}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Hallazgos */}
          {/* ── Radar Likert ─────────────────────────────────── */}
          {likertData.length > 0 && (
            <div className="card">
              <h3 className="font-semibold text-garnier-800 mb-4 flex items-center gap-2">
                <i className="fi fi-rr-chart-histogram text-brand-500 leading-none" />
                Puntaje por dimensión Likert
              </h3>
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={likertData}>
                  <PolarGrid stroke="#e5e7eb" />
                  <PolarAngleAxis dataKey="label" tick={{ fontSize: 11, fill: '#4A4A4A' }} />
                  <PolarRadiusAxis angle={90} domain={[0, 5]} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                  <Radar
                    name="Puntaje" dataKey="avg"
                    stroke="#8DC63F" fill="#8DC63F" fillOpacity={0.3}
                    dot={{ fill: '#8DC63F', r: 4 }}
                  />
                  <Tooltip
                    formatter={(v) => [`${v} / 5`, 'Promedio']}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }}
                  />
                </RadarChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-2 mt-2 justify-center">
                {likertData.map((d) => (
                  <div key={d.key} className="text-center px-3">
                    <p className="text-xs font-bold text-brand-600">{d.avg}</p>
                    <p className="text-xs text-gray-400">{d.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Botón exportar Excel */}
          <motion.button
            onClick={handleExport}
            disabled={exporting}
            whileHover={!exporting ? { scale: 1.02 } : {}}
            whileTap={!exporting ? { scale: 0.98 } : {}}
            className="btn-secondary w-full flex items-center justify-center gap-2"
          >
            {exporting
              ? <><i className="fi fi-rr-spinner animate-spin leading-none" /> Generando Excel...</>
              : <><i className="fi fi-rr-file-spreadsheet leading-none" /> Exportar resultados a Excel</>
            }
          </motion.button>

          {data.aiSummary?.keyInsights?.length > 0 && (
            <div className="card">
              <h3 className="font-semibold text-garnier-800 mb-3 text-sm flex items-center gap-1.5">
                <i className="fi fi-rr-bulb leading-none text-brand-500" /> Hallazgos estratégicos
              </h3>
              <ul className="space-y-2">
                {data.aiSummary.keyInsights.map((item, i) => (
                  <li key={i} className="flex gap-2 text-sm text-gray-600">
                    <i className="fi fi-rr-angle-right text-brand-400 leading-none flex-shrink-0 mt-0.5" /> {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Acciones */}
          {data.aiSummary?.recommendedActions?.length > 0 && (
            <div className="card">
              <h3 className="font-semibold text-garnier-800 mb-3 text-sm flex items-center gap-1.5">
                <i className="fi fi-rr-target leading-none text-brand-500" /> Acciones recomendadas
              </h3>
              <ul className="space-y-2">
                {data.aiSummary.recommendedActions.map((item, i) => (
                  <li key={i} className="flex gap-2 text-sm text-gray-600">
                    <i className="fi fi-rr-check text-green-500 leading-none flex-shrink-0 mt-0.5" /> {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
          </>
          )}
        </motion.div>
      )}
    </motion.div>
  );
};

export default ENPSDashboard;
