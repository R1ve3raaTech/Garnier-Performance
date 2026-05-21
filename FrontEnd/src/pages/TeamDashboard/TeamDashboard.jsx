import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { showError } from '../../utils/alerts';

const ALERT_STYLE = {
  CRITICO:   { bg: 'bg-red-50    border-red-200',    badge: 'bg-red-100    text-red-700',    icon: 'fi-rr-siren',              color: 'text-red-600'    },
  MODERADO:  { bg: 'bg-amber-50  border-amber-200',  badge: 'bg-amber-100  text-amber-700',  icon: 'fi-rr-triangle-warning',   color: 'text-amber-600'  },
  BAJO:      { bg: 'bg-yellow-50 border-yellow-200', badge: 'bg-yellow-100 text-yellow-700', icon: 'fi-rr-chart-line-down',    color: 'text-yellow-600' },
  NORMAL:    { bg: 'bg-green-50  border-green-200',  badge: 'bg-green-100  text-green-700',  icon: 'fi-rr-check-circle',       color: 'text-green-600'  },
  SIN_DATOS: { bg: 'bg-gray-50   border-gray-200',   badge: 'bg-gray-100   text-gray-600',   icon: 'fi-rr-database',           color: 'text-gray-500'   },
};

const TeamDashboard = () => {
  const { user } = useAuth();
  const [areas,        setAreas]        = useState([]);
  const [areaId,       setAreaId]       = useState(user?.area_id ?? '');
  const [data,         setData]         = useState(null);
  const [crisisData,   setCrisisData]   = useState(null);
  const [trendData,    setTrendData]    = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [loadingAreas, setLoadingAreas] = useState(true);

  // Cargar áreas disponibles
  useEffect(() => {
    const fetchAreas = async () => {
      try {
        const res = await api.get('/areas');
        setAreas(res.data.data ?? []);
      } catch {
        showError('Error', 'No se pudo cargar la lista de áreas');
      } finally {
        setLoadingAreas(false);
      }
    };
    fetchAreas();
  }, []);

  const fetchAll = async () => {
    if (!areaId) return;
    setLoading(true); setData(null); setCrisisData(null); setTrendData([]);
    try {
      const [alertsRes, crisisRes, trendRes] = await Promise.all([
        api.get(`/pulse-work/dashboard/alerts/${areaId}`),
        api.get(`/pulse-work/crisis-alerts/${areaId}`).catch(() => null),
        api.get(`/pulse-work/trend/${areaId}?days=30`).catch(() => null),
      ]);
      setData(alertsRes.data.data);
      if (crisisRes) setCrisisData(crisisRes.data.data);
      if (trendRes)  setTrendData(trendRes.data.data?.trend ?? []);
    } catch (err) {
      showError('Error', err.response?.data?.error?.message ?? 'Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const style = data ? (ALERT_STYLE[data.aiAnalysis?.alertLevel] ?? ALERT_STYLE.SIN_DATOS) : null;
  const selectedArea = areas.find((a) => a.id === Number(areaId));

  return (
    <motion.div
      className="p-8 max-w-3xl mx-auto"
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
    >
      <div className="flex items-center gap-2 mb-1">
        <div className="w-1 h-7 bg-brand-500 rounded-full" />
        <h1 className="text-2xl font-bold text-garnier-800">Dashboard de Equipo</h1>
      </div>
      <p className="text-gray-500 text-sm mb-6">
        Análisis de bienestar emocional — Garnier · {user?.area_name}
      </p>

      {/* Selector de área */}
      <div className="card mb-6 space-y-3">
        <label className="label flex items-center gap-1.5">
          <i className="fi fi-rr-building text-brand-500 text-xs leading-none" /> Área a analizar
        </label>
        <div className="flex gap-3">
          {loadingAreas ? (
            <div className="input flex-1 flex items-center gap-2 text-gray-400 text-sm">
              <i className="fi fi-rr-spinner animate-spin leading-none" /> Cargando áreas...
            </div>
          ) : (
            <select
              value={areaId}
              onChange={(e) => { setAreaId(e.target.value); setData(null); setCrisisData(null); }}
              className="input flex-1"
            >
              <option value="">— Selecciona un área —</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} {a.id === user?.area_id ? '(tu área)' : ''}
                </option>
              ))}
            </select>
          )}
          <motion.button
            onClick={fetchAll}
            disabled={loading || !areaId}
            whileHover={!loading && areaId ? { scale: 1.02 } : {}}
            whileTap={!loading && areaId ? { scale: 0.98 } : {}}
            className="btn-primary flex items-center gap-2 whitespace-nowrap"
          >
            {loading
              ? <><i className="fi fi-rr-spinner animate-spin leading-none" /> Analizando...</>
              : <><i className="fi fi-rr-search leading-none" /> Analizar área</>
            }
          </motion.button>
        </div>
      </div>

      {/* ── Alerta de crisis ──────────────────────────────────────── */}
      {crisisData?.totalCrisis > 0 && (
        <motion.div
          className="card border-red-300 bg-red-50 mb-4"
          initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center flex-shrink-0">
              <i className="fi fi-rr-siren text-white text-lg leading-none" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-red-700">Señales de crisis detectadas</p>
              <p className="text-xs text-red-500">{crisisData.areaName} — Últimos 30 días</p>
            </div>
            <span className="bg-red-600 text-white text-xs font-black px-3 py-1 rounded-full">
              {crisisData.totalCrisis} alerta{crisisData.totalCrisis > 1 ? 's' : ''}
            </span>
          </div>

          <div className="space-y-2 mb-3">
            {crisisData.alerts.map((alert) => (
              <div key={alert.id} className="bg-white rounded-lg px-3 py-2 border border-red-100 text-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-gray-500 text-xs">
                    <i className="fi fi-rr-calendar mr-1 leading-none" />
                    {new Date(alert.created_at).toLocaleDateString('es-CR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="text-xs text-red-600 font-semibold">
                    Bienestar: {alert.emotion_score}/5
                  </span>
                </div>
                {alert.ai_keywords?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {alert.ai_keywords.map((kw) => (
                      <span key={kw} className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">{kw}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 bg-red-100 rounded-lg px-3 py-2">
            <i className="fi fi-rr-hospital text-red-600 leading-none" />
            <p className="text-xs text-red-700 font-medium">
              Se recomienda que RH realice seguimiento proactivo y confidencial con el equipo.
            </p>
          </div>
        </motion.div>
      )}

      {/* ── Resultado del análisis ────────────────────────────────── */}
      {data && style && (
        <motion.div
          className="space-y-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}
        >
          {/* Nivel de alerta */}
          <div className={`card border ${style.bg}`}>
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${style.badge}`}>
                <i className={`fi ${style.icon} text-lg leading-none`} />
              </div>
              <div>
                <p className="font-bold text-garnier-800">{data.areaName} — {data.period}</p>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${style.badge}`}>
                  {data.aiAnalysis?.alertLevel ?? 'SIN_DATOS'}
                </span>
              </div>
            </div>
            <p className="text-sm text-gray-700 mt-2 leading-relaxed">{data.aiAnalysis?.summary}</p>
          </div>

          {/* Stats */}
          {data.stats && (
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Registros',    value: data.stats.total,                  highlight: false },
                { label: 'Promedio',     value: `${data.stats.avgScore}/5`,        highlight: false },
                { label: '% Negativos', value: `${data.stats.negativePct}%`,      highlight: data.stats.negativePct > 40 },
                { label: 'Crisis',       value: data.stats.crisisCount ?? 0,       highlight: data.stats.crisisCount > 0 },
              ].map(({ label, value, highlight }) => (
                <div key={label} className={`card text-center py-3 ${highlight ? 'border-red-200 bg-red-50' : ''}`}>
                  <p className={`text-xl font-black ${highlight ? 'text-red-600' : 'text-garnier-800'}`}>{value}</p>
                  <p className="text-xs text-gray-500 mt-1">{label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Keywords negativos */}
          {data.topNegativeKeywords?.length > 0 && (
            <div className="card">
              <h3 className="font-semibold text-garnier-800 mb-2 text-sm flex items-center gap-1.5">
                <i className="fi fi-rr-tags text-brand-500 leading-none" /> Temas negativos frecuentes
              </h3>
              <div className="flex flex-wrap gap-2">
                {data.topNegativeKeywords.map((kw) => (
                  <span key={kw} className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full font-medium">{kw}</span>
                ))}
              </div>
            </div>
          )}

          {/* Gráfico de tendencia emocional */}
          {trendData.length > 1 && (
            <div className="card">
              <h3 className="font-semibold text-garnier-800 mb-4 flex items-center gap-2">
                <i className="fi fi-rr-chart-line-up text-brand-500 leading-none" />
                Tendencia emocional — últimos 30 días
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={trendData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }}
                    tickFormatter={(d) => new Date(d).toLocaleDateString('es-CR', { day: '2-digit', month: 'short' })} />
                  <YAxis domain={[1, 5]} ticks={[1,2,3,4,5]} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                  <Tooltip
                    labelFormatter={(d) => new Date(d).toLocaleDateString('es-CR', { day: '2-digit', month: 'long' })}
                    formatter={(v) => [`${v} / 5`, 'Promedio bienestar']}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }}
                  />
                  <ReferenceLine y={3} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: 'Umbral', position: 'right', fontSize: 10, fill: '#f59e0b' }} />
                  <Line type="monotone" dataKey="avgScore" stroke="#8DC63F" strokeWidth={2.5}
                    dot={{ fill: '#8DC63F', r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Recomendaciones */}
          {data.aiAnalysis?.recommendations?.length > 0 && (
            <div className="card">
              <h3 className="font-semibold text-garnier-800 mb-3 text-sm flex items-center gap-1.5">
                <i className="fi fi-rr-lightbulb text-brand-500 leading-none" /> Recomendaciones de la IA
              </h3>
              <ul className="space-y-2">
                {data.aiAnalysis.recommendations.map((r, i) => (
                  <li key={i} className="flex gap-2 text-sm text-gray-600">
                    <i className="fi fi-rr-angle-right text-brand-400 leading-none flex-shrink-0 mt-0.5" /> {r}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
};

export default TeamDashboard;
