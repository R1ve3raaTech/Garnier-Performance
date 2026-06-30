import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../services/api';
import { showError, showSuccess, showConfirm } from '../../utils/alerts';
import { ROLES } from '../../constants/roles';

const TABS = [
  { key: 'pending',  label: 'Pendientes' },
  { key: 'approved', label: 'Aprobadas'  },
  { key: 'rejected', label: 'Rechazadas' },
];

const emptyDecision = { roleId: '1', areaId: '', position: '' };

const SignupRequests = () => {
  const [tab,      setTab]      = useState('pending');
  const [requests, setRequests] = useState([]);
  const [areas,    setAreas]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [decisions, setDecisions] = useState({}); // { [requestId]: { roleId, areaId, position } }
  const [processingId, setProcessingId] = useState(null);

  const fetchRequests = async (status) => {
    setLoading(true);
    try {
      const { data } = await api.get('/signup/requests', { params: { status } });
      setRequests(data.data ?? []);
    } catch {
      showError('Error', 'No se pudieron cargar las solicitudes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRequests(tab); }, [tab]);
  useEffect(() => {
    api.get('/areas').then(({ data }) => setAreas(data.data ?? []))
      .catch(() => showError('Error', 'No se pudieron cargar las áreas. Recarga la página para poder aprobar solicitudes.'));
  }, []);

  const getDecision = (id) => decisions[id] ?? emptyDecision;
  const setDecision = (id, patch) => setDecisions((prev) => ({ ...prev, [id]: { ...getDecision(id), ...patch } }));

  const handleApprove = async (req) => {
    const decision = getDecision(req.id);
    if (!decision.areaId) {
      showError('Falta el área', 'Selecciona el área del colaborador antes de aprobar.');
      return;
    }
    if (!decision.position?.trim()) {
      showError('Falta el puesto', 'Indica el puesto del colaborador antes de aprobar.');
      return;
    }

    const roleName = ROLES.find((r) => r.id === Number(decision.roleId))?.name ?? 'rol desconocido';
    const areaName = areas.find((a) => a.id === Number(decision.areaId))?.name ?? 'área desconocida';
    const result = await showConfirm(
      `¿Aprobar a ${req.name}?`,
      `Quedará como "${roleName}" en el área de "${areaName}". Se le enviará un correo de invitación a ${req.email}.`
    );
    if (!result.isConfirmed) return;

    setProcessingId(req.id);
    try {
      await api.put(`/signup/requests/${req.id}/approve`, {
        roleId: Number(decision.roleId),
        areaId: Number(decision.areaId),
        position: decision.position.trim(),
      });
      showSuccess('Solicitud aprobada', `Se envió la invitación a ${req.email}.`);
      setRequests((prev) => prev.filter((r) => r.id !== req.id));
    } catch (err) {
      showError('No se pudo aprobar', err.response?.data?.error?.message ?? 'Intenta de nuevo.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (req) => {
    const result = await showConfirm(`¿Rechazar a ${req.name}?`, 'Podrá volver a registrarse más adelante si lo deseas.');
    if (!result.isConfirmed) return;

    setProcessingId(req.id);
    try {
      await api.put(`/signup/requests/${req.id}/reject`);
      showSuccess('Solicitud rechazada', '');
      setRequests((prev) => prev.filter((r) => r.id !== req.id));
    } catch (err) {
      showError('No se pudo rechazar', err.response?.data?.error?.message ?? 'Intenta de nuevo.');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-1 h-7 bg-brand-500 rounded-full" />
        <div>
          <h1 className="text-2xl font-bold text-garnier-800">Solicitudes de Registro</h1>
          <p className="text-gray-500 text-sm">Revisa, asigna área/puesto/rol y aprueba a los nuevos colaboradores</p>
        </div>
      </div>

      <div className="flex gap-1 mb-5 border-b border-gray-200">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === key ? 'border-brand-500 text-brand-600' : 'border-transparent text-gray-500 hover:text-garnier-800'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-gray-400">
          <i className="fi fi-rr-spinner animate-spin text-2xl leading-none" />
        </div>
      ) : requests.length === 0 ? (
        <div className="card text-center py-10 text-gray-400">
          No hay solicitudes {TABS.find((t) => t.key === tab)?.label.toLowerCase()}
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {requests.map((req) => {
              const decision = getDecision(req.id);
              return (
                <motion.div
                  key={req.id}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}
                  className="card"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-brand-500 flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold text-sm">{req.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-garnier-800">{req.name}</h3>
                      <p className="text-sm text-gray-500 truncate">{req.email}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Solicitado el {new Date(req.created_at).toLocaleDateString('es-CR')}
                        {req.area_name && ` · ${req.area_name}`}
                        {req.position && ` · ${req.position}`}
                      </p>
                      {req.reviewed_by_name && (
                        <p className="text-xs text-gray-400">Revisado por {req.reviewed_by_name}</p>
                      )}
                    </div>
                  </div>

                  {tab === 'pending' && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <select
                        value={decision.areaId}
                        onChange={(e) => setDecision(req.id, { areaId: e.target.value })}
                        className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-400"
                      >
                        <option value="" disabled>Área...</option>
                        {areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                      </select>
                      <input
                        type="text"
                        placeholder="Puesto"
                        value={decision.position}
                        onChange={(e) => setDecision(req.id, { position: e.target.value })}
                        className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 w-32 focus:outline-none focus:ring-2 focus:ring-brand-400"
                      />
                      <select
                        value={decision.roleId}
                        onChange={(e) => setDecision(req.id, { roleId: e.target.value })}
                        className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-400"
                      >
                        {ROLES.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                      </select>
                      <button
                        onClick={() => handleApprove(req)}
                        disabled={processingId === req.id}
                        className="px-3 py-1.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5"
                      >
                        {processingId === req.id
                          ? <i className="fi fi-rr-spinner animate-spin leading-none" />
                          : <i className="fi fi-rr-check leading-none" />}
                        Aprobar
                      </button>
                      <button
                        onClick={() => handleReject(req)}
                        disabled={processingId === req.id}
                        className="px-3 py-1.5 border border-gray-200 hover:bg-red-50 hover:border-red-200 hover:text-red-600 disabled:opacity-50 text-gray-600 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5"
                      >
                        {processingId === req.id && <i className="fi fi-rr-spinner animate-spin leading-none" />}
                        Rechazar
                      </button>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default SignupRequests;
