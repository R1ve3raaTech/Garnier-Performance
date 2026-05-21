import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { showSuccess, showError, showConfirm } from '../../utils/alerts';

const COMPETENCIES = [
  { key: 'colaboracion', label: 'Colaboración'  },
  { key: 'comunicacion', label: 'Comunicación'  },
  { key: 'iniciativa',   label: 'Iniciativa'    },
  { key: 'calidad',      label: 'Calidad'       },
  { key: 'adaptabilidad',label: 'Adaptabilidad' },
];

const SCORE_COLOR = {
  1: 'bg-red-500    text-white',
  2: 'bg-orange-400 text-white',
  3: 'bg-yellow-400 text-white',
  4: 'bg-brand-400  text-white',
  5: 'bg-brand-500  text-white',
};

// ── Sección de registro de la reunión ─────────────────────────────────────────
const RecordSection = ({ data, employeeId, onSaved }) => {
  const today = new Date().toISOString().split('T')[0];
  const [meetingDate,    setMeetingDate]    = useState(today);
  const [newCommitment,  setNewCommitment]  = useState('');
  const [commitments,    setCommitments]    = useState(
    data.agenda?.suggestedTopics?.slice(0, 3).map((t) => ({ text: t, completed: false })) ?? []
  );
  const [scores,         setScores]         = useState({});
  const [leaderComment,  setLeaderComment]  = useState('');
  const [nextSteps,      setNextSteps]      = useState('');
  const [saving,         setSaving]         = useState(false);

  const addCommitment = () => {
    if (!newCommitment.trim()) return;
    setCommitments((prev) => [...prev, { text: newCommitment.trim(), completed: false }]);
    setNewCommitment('');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post('/meetings/records', {
        employeeId,
        meetingDate,
        commitments,
        leaderFeedback: { scores, comment: leaderComment },
        nextSteps: nextSteps || undefined,
      });
      await showSuccess('Reunión registrada', 'Los compromisos y feedback han sido guardados.');
      onSaved();
    } catch (err) {
      showError('Error', err.response?.data?.error?.message ?? 'No se pudo guardar la reunión');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div className="space-y-4" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center gap-2 mt-2">
        <div className="w-1 h-5 bg-green-500 rounded-full" />
        <h3 className="font-bold text-garnier-800">Registrar esta reunión</h3>
      </div>

      {/* Fecha */}
      <div className="card space-y-3">
        <div>
          <label className="label text-xs flex items-center gap-1.5">
            <i className="fi fi-rr-calendar text-brand-500 leading-none" /> Fecha de la reunión
          </label>
          <input type="date" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} className="input" />
        </div>

        {/* Compromisos */}
        <div>
          <label className="label text-xs flex items-center gap-1.5">
            <i className="fi fi-rr-list-check text-brand-500 leading-none" /> Compromisos acordados
          </label>
          <div className="space-y-1.5 mb-2">
            {commitments.map((c, i) => (
              <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-1.5">
                <input type="checkbox" checked={c.completed}
                  onChange={() => setCommitments((prev) => prev.map((x, j) => j === i ? { ...x, completed: !x.completed } : x))}
                  className="rounded border-gray-300 text-brand-500" />
                <span className={`text-sm flex-1 ${c.completed ? 'line-through text-gray-400' : 'text-garnier-800'}`}>{c.text}</span>
                <button onClick={() => setCommitments((prev) => prev.filter((_, j) => j !== i))}
                  className="text-gray-300 hover:text-red-400 transition-colors">
                  <i className="fi fi-rr-cross text-xs leading-none" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={newCommitment} onChange={(e) => setNewCommitment(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCommitment())}
              placeholder="Agregar compromiso..." className="input flex-1 text-sm" />
            <button onClick={addCommitment} className="btn-secondary text-sm px-3">
              <i className="fi fi-rr-add leading-none" />
            </button>
          </div>
        </div>
      </div>

      {/* Evaluación de competencias */}
      <div className="card">
        <label className="label text-xs flex items-center gap-1.5 mb-3">
          <i className="fi fi-rr-star text-brand-500 leading-none" /> Evaluación del colaborador (1-5)
        </label>
        <div className="space-y-2">
          {COMPETENCIES.map(({ key, label }) => (
            <div key={key} className="flex items-center gap-3">
              <span className="text-xs text-garnier-800 w-24 flex-shrink-0">{label}</span>
              <div className="flex gap-1 flex-1">
                {[1,2,3,4,5].map((v) => (
                  <button key={v} type="button" onClick={() => setScores((p) => ({ ...p, [key]: v }))}
                    className={`flex-1 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                      scores[key] === v ? `${SCORE_COLOR[v]} border-transparent shadow-sm` : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300'
                    }`}>{v}</button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3">
          <label className="label text-xs">Comentario del líder (opcional)</label>
          <textarea rows={2} value={leaderComment} onChange={(e) => setLeaderComment(e.target.value)}
            placeholder="Aspectos destacados, áreas de mejora..." className="input resize-none text-sm" />
        </div>
      </div>

      {/* Próximos pasos */}
      <div className="card">
        <label className="label text-xs flex items-center gap-1.5">
          <i className="fi fi-rr-arrow-right text-brand-500 leading-none" /> Próximos pasos
        </label>
        <textarea rows={2} value={nextSteps} onChange={(e) => setNextSteps(e.target.value)}
          placeholder="Acciones concretas para el próximo período..." className="input resize-none text-sm" />
      </div>

      <motion.button onClick={handleSave} disabled={saving}
        whileHover={!saving ? { scale: 1.02 } : {}} whileTap={!saving ? { scale: 0.98 } : {}}
        className="btn-primary w-full flex items-center justify-center gap-2">
        {saving
          ? <><i className="fi fi-rr-spinner animate-spin leading-none" /> Guardando...</>
          : <><i className="fi fi-rr-disk leading-none" /> Guardar registro de reunión</>
        }
      </motion.button>
    </motion.div>
  );
};

// ── Historial de reuniones ────────────────────────────────────────────────────
const MeetingHistory = ({ employeeId }) => {
  const [records,  setRecords]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [open,     setOpen]     = useState(false);

  useEffect(() => {
    if (!open) return;
    api.get(`/meetings/records/${employeeId}`)
      .then((r) => setRecords(r.data.data.records ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, employeeId]);

  return (
    <div className="card">
      <button onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between text-sm font-semibold text-garnier-800">
        <span className="flex items-center gap-2">
          <i className="fi fi-rr-time-past text-brand-500 leading-none" /> Historial de reuniones anteriores
        </span>
        <i className={`fi ${open ? 'fi-rr-angle-up' : 'fi-rr-angle-down'} leading-none text-gray-400`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="mt-4 space-y-3">
              {loading ? (
                <div className="flex justify-center py-4 text-gray-400">
                  <i className="fi fi-rr-spinner animate-spin leading-none" />
                </div>
              ) : records.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-3">No hay reuniones registradas aún.</p>
              ) : records.map((r) => (
                <div key={r.id} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-garnier-800">
                      <i className="fi fi-rr-calendar text-brand-400 mr-1 leading-none" />
                      {new Date(r.meeting_date).toLocaleDateString('es-CR', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </p>
                    {r.commitments?.length > 0 && (
                      <span className="text-xs text-gray-500">{r.commitments.filter((c) => c.completed).length}/{r.commitments.length} compromisos</span>
                    )}
                  </div>
                  {r.commitments?.length > 0 && (
                    <ul className="space-y-1 mb-2">
                      {r.commitments.map((c, i) => (
                        <li key={i} className={`text-xs flex items-center gap-1.5 ${c.completed ? 'text-green-600' : 'text-gray-500'}`}>
                          <i className={`fi ${c.completed ? 'fi-rr-check-circle' : 'fi-rr-circle'} leading-none`} />
                          {c.text}
                        </li>
                      ))}
                    </ul>
                  )}
                  {r.nextSteps && (
                    <p className="text-xs text-gray-500 italic border-t border-gray-200 pt-2 mt-2">
                      <i className="fi fi-rr-arrow-right text-brand-400 mr-1 leading-none" />{r.nextSteps}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Página principal ──────────────────────────────────────────────────────────
const Meetings = () => {
  const { user } = useAuth();
  const [collaborators, setCollaborators] = useState([]);
  const [selectedUser,  setSelectedUser]  = useState('');
  const [commitments,   setCommitments]   = useState('');
  const [data,          setData]          = useState(null);
  const [loading,       setLoading]       = useState(false);
  const [loadingUsers,  setLoadingUsers]  = useState(true);
  const [recorded,      setRecorded]      = useState(false);

  useEffect(() => {
    const fetchCollaborators = async () => {
      try {
        const res = await api.get(`/users/by-area/${user.area_id}`);
        setCollaborators(res.data.data.filter((u) => u.id !== user.id));
      } catch {
        showError('Error', 'No se pudo cargar la lista de colaboradores');
      } finally {
        setLoadingUsers(false);
      }
    };
    fetchCollaborators();
  }, [user.area_id, user.id]);

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    setLoading(true); setData(null); setRecorded(false);

    const pastCommitments = commitments
      .split('\n').map((l) => l.trim()).filter(Boolean)
      .map((commitment) => ({ commitment, completed: false }));

    try {
      const { data: res } = await api.post('/performance/1on1-prep', { userId: Number(selectedUser), pastCommitments });
      setData(res.data);
    } catch (err) {
      showError('Error', err.response?.data?.error?.message ?? 'Error al generar la agenda');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div className="p-8 max-w-3xl mx-auto"
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>

      <div className="flex items-center gap-2 mb-1">
        <div className="w-1 h-7 bg-brand-500 rounded-full" />
        <h1 className="text-2xl font-bold text-garnier-800">Reuniones 1:1</h1>
      </div>
      <p className="text-gray-500 text-sm mb-6">Prepara, registra y da seguimiento a tus reuniones de equipo</p>

      {/* Formulario de preparación */}
      <form onSubmit={handleGenerate} className="card mb-6 space-y-4">
        <div>
          <label className="label flex items-center gap-1.5">
            <i className="fi fi-rr-user text-brand-500 text-xs leading-none" /> Colaborador
          </label>
          {loadingUsers ? (
            <div className="input flex items-center gap-2 text-gray-400 text-sm">
              <i className="fi fi-rr-spinner animate-spin leading-none" /> Cargando colaboradores...
            </div>
          ) : collaborators.length === 0 ? (
            <p className="text-sm text-gray-400 py-2">No hay colaboradores en tu área.</p>
          ) : (
            <select required value={selectedUser}
              onChange={(e) => { setSelectedUser(e.target.value); setData(null); setRecorded(false); }} className="input">
              <option value="">— Selecciona un colaborador —</option>
              {collaborators.map((c) => (
                <option key={c.id} value={c.id}>{c.name} {c.position ? `· ${c.position}` : ''} ({c.role})</option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label className="label flex items-center gap-1.5">
            <i className="fi fi-rr-list-check text-brand-500 text-xs leading-none" />
            Compromisos pendientes del período anterior
            <span className="font-normal text-gray-400">(uno por línea, opcional)</span>
          </label>
          <textarea rows={3} value={commitments} onChange={(e) => setCommitments(e.target.value)}
            placeholder={'Revisar proceso de tickets\nCompletar certificación AWS\n...'} className="input resize-none" />
        </div>

        <motion.button type="submit" disabled={loading || !selectedUser || loadingUsers}
          whileHover={!loading && selectedUser ? { scale: 1.02 } : {}}
          whileTap={!loading && selectedUser ? { scale: 0.98 } : {}}
          className="btn-primary w-full flex items-center justify-center gap-2">
          {loading
            ? <><i className="fi fi-rr-spinner animate-spin leading-none" /> Generando agenda...</>
            : <><i className="fi fi-rr-magic-wand leading-none" /> Generar agenda con IA</>
          }
        </motion.button>
      </form>

      {/* Historial (siempre visible cuando hay colaborador seleccionado) */}
      {selectedUser && <div className="mb-4"><MeetingHistory employeeId={Number(selectedUser)} /></div>}

      {data && (
        <motion.div className="space-y-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>

          {/* Header */}
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-brand-500 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-black text-xl">{data.employee?.name?.charAt(0).toUpperCase()}</span>
            </div>
            <div>
              <p className="text-xs text-gray-400">Reunión 1:1 con</p>
              <h2 className="font-bold text-garnier-800 text-lg">{data.employee?.name}</h2>
              <p className="text-sm text-gray-500">{data.employee?.position}</p>
            </div>
          </div>

          {/* Avance de metas */}
          <div className="card">
            <h3 className="font-semibold text-garnier-800 mb-3 flex items-center gap-2">
              <i className="fi fi-rr-bullseye text-brand-500 leading-none" /> Avance de metas
            </h3>
            {data.goalsProgress?.length === 0 ? (
              <p className="text-sm text-gray-400">Sin metas registradas.</p>
            ) : data.goalsProgress.map((g, i) => {
              const pct = g.targetValue > 0 ? Math.round((g.currentValue / g.targetValue) * 100) : 0;
              return (
                <div key={i} className="mb-3 last:mb-0">
                  <div className="flex justify-between text-sm mb-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${g.type === 'OKR' ? 'bg-garnier-800 text-white' : 'bg-brand-500 text-white'}`}>{g.type}</span>
                      <span className="font-medium text-garnier-800">{g.title}</span>
                    </div>
                    <span className="text-gray-500 font-medium ml-2">{pct}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div className={`h-1.5 rounded-full ${pct >= 80 ? 'bg-brand-500' : pct >= 50 ? 'bg-brand-300' : 'bg-amber-400'}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Agenda IA */}
          {[
            { title: 'Temas sugeridos',      key: 'suggestedTopics',    icon: 'fi-rr-list-check',       color: 'text-brand-600'   },
            { title: 'Hallazgos clave',       key: 'keyFindings',        icon: 'fi-rr-search',           color: 'text-garnier-800' },
            { title: 'Acciones recomendadas', key: 'recommendedActions', icon: 'fi-rr-checkbox',         color: 'text-green-600'   },
            { title: 'Alertas de riesgo',     key: 'riskFlags',          icon: 'fi-rr-triangle-warning', color: 'text-red-600'     },
          ].map(({ title, key, icon, color }) =>
            data.agenda?.[key]?.length > 0 && (
              <div key={key} className="card">
                <h3 className={`font-semibold mb-3 flex items-center gap-2 ${color}`}>
                  <i className={`fi ${icon} leading-none`} /> {title}
                </h3>
                <ul className="space-y-2">
                  {data.agenda[key].map((item, i) => (
                    <li key={i} className="flex gap-2 text-sm text-gray-600">
                      <i className="fi fi-rr-angle-right text-brand-400 leading-none flex-shrink-0 mt-0.5" /> {item}
                    </li>
                  ))}
                </ul>
              </div>
            )
          )}

          {/* Registro */}
          {!recorded ? (
            <RecordSection
              data={data}
              employeeId={Number(selectedUser)}
              onSaved={() => setRecorded(true)}
            />
          ) : (
            <div className="card bg-green-50 border-green-200 flex items-center gap-3">
              <i className="fi fi-rr-check-circle text-green-500 text-xl leading-none" />
              <div>
                <p className="font-semibold text-green-700">Reunión registrada correctamente</p>
                <p className="text-xs text-green-600">Los compromisos y el feedback quedaron guardados en el historial.</p>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
};

export default Meetings;
