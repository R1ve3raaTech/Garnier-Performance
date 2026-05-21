import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../services/api';
import { showSuccess, showError, showConfirm } from '../../utils/alerts';

const STATUS_TABS = [
  { id: 'pending',   label: 'Pendientes',   icon: 'fi-rr-bell',         badge: 'bg-red-100   text-red-700'   },
  { id: 'in_review', label: 'En revisión',  icon: 'fi-rr-eye',          badge: 'bg-amber-100 text-amber-700' },
  { id: 'resolved',  label: 'Resueltas',    icon: 'fi-rr-check-circle', badge: 'bg-green-100 text-green-700' },
];

const EscalationCard = ({ query, onStatusChange, updating }) => (
  <motion.div
    className="card hover:shadow-md transition-shadow"
    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
    layout
  >
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1 min-w-0">
        {/* Meta */}
        <div className="flex items-center gap-2 mb-2 flex-wrap text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <i className="fi fi-rr-building leading-none" /> {query.area_name}
          </span>
          <span>·</span>
          <span className="flex items-center gap-1">
            <i className="fi fi-rr-calendar leading-none" />
            {new Date(query.created_at).toLocaleDateString('es-CR', {
              day: '2-digit', month: 'short', year: 'numeric',
              hour: '2-digit', minute: '2-digit',
            })}
          </span>
          {query.resolved_by_name && (
            <>
              <span>·</span>
              <span className="flex items-center gap-1 text-green-600">
                <i className="fi fi-rr-user-check leading-none" /> Resuelto por {query.resolved_by_name}
              </span>
            </>
          )}
        </div>

        {/* Pregunta */}
        <div className="bg-gray-50 rounded-lg px-4 py-3 border border-gray-100">
          <p className="text-sm text-garnier-800 leading-relaxed">
            <i className="fi fi-rr-comment-alt text-brand-400 mr-2 leading-none" />
            {query.question}
          </p>
        </div>
      </div>

      {/* Acciones */}
      <div className="flex flex-col gap-2 flex-shrink-0">
        {query.status === 'pending' && (
          <button
            onClick={() => onStatusChange(query.id, 'in_review')}
            disabled={updating}
            className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1 whitespace-nowrap"
          >
            {updating ? <i className="fi fi-rr-spinner animate-spin leading-none" /> : <i className="fi fi-rr-eye leading-none" />}
            Revisar
          </button>
        )}
        {query.status !== 'resolved' && (
          <button
            onClick={() => onStatusChange(query.id, 'resolved')}
            disabled={updating}
            className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1 whitespace-nowrap"
          >
            {updating ? <i className="fi fi-rr-spinner animate-spin leading-none" /> : <i className="fi fi-rr-check leading-none" />}
            Resolver
          </button>
        )}
      </div>
    </div>
  </motion.div>
);

const Escalations = () => {
  const [activeTab,   setActiveTab]   = useState('pending');
  const [queries,     setQueries]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [updatingId,  setUpdatingId]  = useState(null);
  const [counts,      setCounts]      = useState({ pending: 0, in_review: 0, resolved: 0 });

  const fetchQueries = useCallback(async (status) => {
    setLoading(true);
    try {
      const res = await api.get(`/hr-assistant/unresolved?status=${status}`);
      setQueries(res.data.data.queries ?? []);
    } catch {
      showError('Error', 'No se pudo cargar las consultas');
    } finally {
      setLoading(false);
    }
  }, []);

  // Cargar conteos para los badges de cada tab
  const fetchCounts = useCallback(async () => {
    try {
      const [p, r, s] = await Promise.all([
        api.get('/hr-assistant/unresolved?status=pending'),
        api.get('/hr-assistant/unresolved?status=in_review'),
        api.get('/hr-assistant/unresolved?status=resolved'),
      ]);
      setCounts({
        pending:   p.data.data.total,
        in_review: r.data.data.total,
        resolved:  s.data.data.total,
      });
    } catch { /* silencioso */ }
  }, []);

  useEffect(() => {
    fetchQueries(activeTab);
    fetchCounts();
  }, [activeTab, fetchQueries, fetchCounts]);

  const handleStatusChange = async (id, newStatus) => {
    if (newStatus === 'resolved') {
      const result = await showConfirm('¿Marcar como resuelta?', 'Confirma que atendiste esta consulta con el colaborador.');
      if (!result.isConfirmed) return;
    }

    setUpdatingId(id);
    try {
      await api.put(`/hr-assistant/unresolved/${id}/status`, { status: newStatus });
      await fetchQueries(activeTab);
      await fetchCounts();
      if (newStatus === 'resolved') showSuccess('Consulta resuelta', 'Se ha registrado como atendida.');
    } catch (err) {
      showError('Error', err.response?.data?.error?.message ?? 'No se pudo actualizar la consulta');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <motion.div
      className="p-8 max-w-3xl mx-auto"
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
    >
      <div className="flex items-center gap-2 mb-6">
        <div className="w-1 h-7 bg-brand-500 rounded-full" />
        <div>
          <h1 className="text-2xl font-bold text-garnier-800">Bandeja de Escalaciones</h1>
          <p className="text-gray-500 text-sm">Consultas sin respuesta derivadas del HR Assistant</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 mb-6 bg-white rounded-t-xl overflow-hidden shadow-sm">
        {STATUS_TABS.map(({ id, label, icon, badge }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-medium transition-colors relative ${
              activeTab === id ? 'text-brand-600' : 'text-gray-400 hover:text-garnier-700'
            }`}
          >
            <i className={`fi ${icon} leading-none`} />
            {label}
            {counts[id] > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${badge}`}>
                {counts[id]}
              </span>
            )}
            {activeTab === id && (
              <motion.div
                layoutId="escalation-tab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-500"
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Contenido */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <i className="fi fi-rr-spinner animate-spin text-2xl leading-none" />
        </div>
      ) : queries.length === 0 ? (
        <motion.div
          className="card text-center py-14"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        >
          <i className="fi fi-rr-check-circle text-4xl text-brand-300 leading-none block mb-3" />
          <p className="text-gray-500 font-medium">
            {activeTab === 'pending'   ? 'No hay consultas pendientes' :
             activeTab === 'in_review' ? 'No hay consultas en revisión' :
             'No hay consultas resueltas aún'}
          </p>
          <p className="text-gray-400 text-sm mt-1">
            {activeTab === 'pending' ? '¡Todo al día! El equipo está bien atendido.' : ''}
          </p>
        </motion.div>
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="space-y-3">
            {queries.map((q) => (
              <EscalationCard
                key={q.id}
                query={q}
                onStatusChange={handleStatusChange}
                updating={updatingId === q.id}
              />
            ))}
          </div>
        </AnimatePresence>
      )}
    </motion.div>
  );
};

export default Escalations;
