import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../services/api';
import { showError, showSuccess, showConfirm } from '../../utils/alerts';

const ROLES = [
  { id: 1, name: 'Funcionario' },
  { id: 2, name: 'Jefatura' },
  { id: 3, name: 'RH' },
  { id: 4, name: 'Admin' },
];

const TABS = [
  { key: 'pending',  label: 'Pendientes' },
  { key: 'approved', label: 'Aprobadas'  },
  { key: 'rejected', label: 'Rechazadas' },
];

const SignupRequests = () => {
  const [tab,      setTab]      = useState('pending');
  const [requests, setRequests] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [roleByRequest, setRoleByRequest] = useState({});
  const [processingId,  setProcessingId]  = useState(null);

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

  const handleApprove = async (req) => {
    const roleId = Number(roleByRequest[req.id] ?? 1);
    const result = await showConfirm(
      `¿Aprobar a ${req.name}?`,
      `Se creará su cuenta como "${ROLES.find((r) => r.id === roleId)?.name}" y se le enviará un correo de invitación a ${req.email}.`
    );
    if (!result.isConfirmed) return;

    setProcessingId(req.id);
    try {
      await api.put(`/signup/requests/${req.id}/approve`, { roleId });
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
          <p className="text-gray-500 text-sm">Revisa y aprueba las cuentas solicitadas por nuevos colaboradores</p>
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
            {requests.map((req) => (
              <motion.div
                key={req.id}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}
                className="card"
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-brand-500 flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold text-sm">{req.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-garnier-800">{req.name}</h3>
                      <p className="text-sm text-gray-500 truncate">{req.email}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {req.area_name} · {req.position} · {new Date(req.created_at).toLocaleDateString('es-CR')}
                      </p>
                      {req.reviewed_by_name && (
                        <p className="text-xs text-gray-400">Revisado por {req.reviewed_by_name}</p>
                      )}
                    </div>
                  </div>

                  {tab === 'pending' && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <select
                        value={roleByRequest[req.id] ?? 1}
                        onChange={(e) => setRoleByRequest((prev) => ({ ...prev, [req.id]: e.target.value }))}
                        className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-400"
                      >
                        {ROLES.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                      </select>
                      <button
                        onClick={() => handleApprove(req)}
                        disabled={processingId === req.id}
                        className="px-3 py-1.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5"
                      >
                        <i className="fi fi-rr-check leading-none" /> Aprobar
                      </button>
                      <button
                        onClick={() => handleReject(req)}
                        disabled={processingId === req.id}
                        className="px-3 py-1.5 border border-gray-200 hover:bg-red-50 hover:border-red-200 hover:text-red-600 disabled:opacity-50 text-gray-600 rounded-lg text-sm font-medium transition-colors"
                      >
                        Rechazar
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default SignupRequests;
