import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../services/api';
import { showSuccess, showError, showConfirm } from '../../utils/alerts';

const STATUS_STYLE = {
  active:  { badge: 'bg-brand-100 text-brand-700',  label: 'Activa',    icon: 'fi-rr-check-circle'  },
  closed:  { badge: 'bg-gray-100  text-gray-500',   label: 'Cerrada',   icon: 'fi-rr-lock'          },
  draft:   { badge: 'bg-amber-100 text-amber-700',  label: 'Borrador',  icon: 'fi-rr-edit'          },
};

// ── Modal nueva encuesta ──────────────────────────────────────────────────────
const CreateModal = ({ onClose, onCreated }) => {
  const [form,    setForm]    = useState({ title: '', description: '', period: '', startDate: '', endDate: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/enps/surveys', {
        title:       form.title,
        description: form.description || undefined,
        period:      form.period      || undefined,
        startDate:   form.startDate   || undefined,
        endDate:     form.endDate     || undefined,
      });
      await showSuccess('Encuesta creada', 'La encuesta ha sido activada y está lista para recibir respuestas.');
      onCreated();
      onClose();
    } catch (err) {
      showError('Error', err.response?.data?.error?.message ?? 'No se pudo crear la encuesta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !loading && onClose()} />
      <motion.div
        className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md"
        initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-garnier-800 flex items-center gap-2">
            <i className="fi fi-rr-document-signed text-brand-500 leading-none" /> Nueva encuesta eNPS
          </h3>
          <button onClick={onClose} disabled={loading} className="text-gray-400 hover:text-gray-600 transition-colors">
            <i className="fi fi-rr-cross leading-none" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="label text-xs">Título <span className="text-red-400">*</span></label>
            <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Ej: Encuesta eNPS Q3-2026" className="input text-sm" />
          </div>
          <div>
            <label className="label text-xs">Período</label>
            <input value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })}
              placeholder="Ej: Q3-2026" className="input text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label text-xs">Fecha inicio</label>
              <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="input text-sm" />
            </div>
            <div>
              <label className="label text-xs">Fecha cierre</label>
              <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className="input text-sm" />
            </div>
          </div>
          <div>
            <label className="label text-xs">Descripción (opcional)</label>
            <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Encuesta semestral de clima y recomendación..." className="input resize-none text-sm" />
          </div>

          <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg text-xs text-amber-700 flex gap-2">
            <i className="fi fi-rr-info leading-none flex-shrink-0 mt-0.5" />
            Al crear esta encuesta, la encuesta activa actual se cerrará automáticamente.
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} disabled={loading} className="btn-secondary flex-1 text-sm">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 text-sm flex items-center justify-center gap-1.5">
              {loading ? <><i className="fi fi-rr-spinner animate-spin leading-none" /> Creando...</> : <><i className="fi fi-rr-check leading-none" /> Crear y activar</>}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

// ── Página principal ──────────────────────────────────────────────────────────
const SurveyManagement = () => {
  const [surveys,     setSurveys]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [showModal,   setShowModal]   = useState(false);
  const [updatingId,  setUpdatingId]  = useState(null);

  const fetchSurveys = async () => {
    try {
      const res = await api.get('/enps/surveys');
      setSurveys(res.data.data ?? []);
    } catch {
      showError('Error', 'No se pudo cargar la lista de encuestas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSurveys(); }, []);

  const handleStatusChange = async (survey, newStatus) => {
    const labels = { active: 'activar', closed: 'cerrar' };
    const result = await showConfirm(
      `¿${labels[newStatus] === 'activar' ? 'Activar' : 'Cerrar'} encuesta?`,
      newStatus === 'active'
        ? 'La encuesta activa actual se cerrará automáticamente.'
        : 'Los colaboradores ya no podrán enviar respuestas.'
    );
    if (!result.isConfirmed) return;

    setUpdatingId(survey.id);
    try {
      await api.put(`/enps/surveys/${survey.id}/status`, { status: newStatus });
      await fetchSurveys();
      showSuccess('Encuesta actualizada', `La encuesta ha sido ${newStatus === 'active' ? 'activada' : 'cerrada'}.`);
    } catch (err) {
      showError('Error', err.response?.data?.error?.message ?? 'No se pudo actualizar la encuesta');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <>
      <motion.div
        className="p-8 max-w-4xl mx-auto"
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-1 h-7 bg-brand-500 rounded-full" />
            <div>
              <h1 className="text-2xl font-bold text-garnier-800">Gestión de Encuestas</h1>
              <p className="text-gray-500 text-sm">Administra las encuestas eNPS de Garnier</p>
            </div>
          </div>
          <motion.button
            onClick={() => setShowModal(true)}
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            className="btn-primary flex items-center gap-2"
          >
            <i className="fi fi-rr-add leading-none" /> Nueva encuesta
          </motion.button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400">
            <i className="fi fi-rr-spinner animate-spin text-2xl leading-none" />
          </div>
        ) : surveys.length === 0 ? (
          <div className="card text-center py-16">
            <i className="fi fi-rr-document-signed text-4xl text-gray-300 leading-none block mb-3" />
            <p className="text-gray-500 font-medium">No hay encuestas creadas aún</p>
            <p className="text-gray-400 text-sm mt-1">Crea la primera encuesta eNPS de Garnier</p>
            <button onClick={() => setShowModal(true)} className="btn-primary mt-4 inline-flex items-center gap-2">
              <i className="fi fi-rr-add leading-none" /> Crear encuesta
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {surveys.map((s) => {
              const st = STATUS_STYLE[s.status] ?? STATUS_STYLE.draft;
              const isUpdating = updatingId === s.id;
              return (
                <motion.div
                  key={s.id}
                  className="card hover:shadow-md transition-shadow"
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-semibold text-garnier-800">{s.title}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${st.badge}`}>
                          <i className={`fi ${st.icon} leading-none`} /> {st.label}
                        </span>
                        {s.period && (
                          <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">{s.period}</span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-xs text-gray-400 flex-wrap">
                        <span className="flex items-center gap-1">
                          <i className="fi fi-rr-user leading-none" /> {s.created_by_name}
                        </span>
                        {s.response_count > 0 && (
                          <span className="flex items-center gap-1 text-brand-600 font-medium">
                            <i className="fi fi-rr-chart-simple leading-none" />
                            {s.response_count} respuesta{s.response_count !== 1 ? 's' : ''}
                          </span>
                        )}
                        {s.start_date && (
                          <span className="flex items-center gap-1">
                            <i className="fi fi-rr-calendar leading-none" />
                            {new Date(s.start_date).toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' })}
                            {s.end_date && ` → ${new Date(s.end_date).toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' })}`}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Acciones */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {s.status === 'draft' && (
                        <button
                          onClick={() => handleStatusChange(s, 'active')}
                          disabled={isUpdating}
                          className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1"
                        >
                          {isUpdating ? <i className="fi fi-rr-spinner animate-spin leading-none" /> : <i className="fi fi-rr-check-circle leading-none" />}
                          Activar
                        </button>
                      )}
                      {s.status === 'active' && (
                        <button
                          onClick={() => handleStatusChange(s, 'closed')}
                          disabled={isUpdating}
                          className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1 text-red-600 border-red-200 hover:bg-red-50"
                        >
                          {isUpdating ? <i className="fi fi-rr-spinner animate-spin leading-none" /> : <i className="fi fi-rr-lock leading-none" />}
                          Cerrar
                        </button>
                      )}
                      {s.status === 'closed' && (
                        <button
                          onClick={() => handleStatusChange(s, 'active')}
                          disabled={isUpdating}
                          className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1"
                        >
                          {isUpdating ? <i className="fi fi-rr-spinner animate-spin leading-none" /> : <i className="fi fi-rr-refresh leading-none" />}
                          Reactivar
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>

      <AnimatePresence>
        {showModal && (
          <CreateModal
            onClose={() => setShowModal(false)}
            onCreated={fetchSurveys}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default SurveyManagement;
