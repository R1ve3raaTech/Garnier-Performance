import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const STATUS_STYLE = {
  EN_PROGRESO: 'bg-brand-100  text-brand-700',
  COMPLETADO:  'bg-green-100  text-green-700',
  PENDIENTE:   'bg-gray-100   text-gray-600',
  CANCELADO:   'bg-red-100    text-red-600',
};

const GoalCard = ({ goal }) => {
  const pct = goal.targetValue > 0
    ? Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100))
    : 0;

  return (
    <div className="card">
      <div className="flex items-start justify-between mb-3">
        <div className="flex gap-2">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            goal.type === 'OKR'
              ? 'bg-garnier-800 text-white'
              : 'bg-brand-500 text-white'
          }`}>{goal.type}</span>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLE[goal.status] ?? ''}`}>
            {goal.status?.replace('_', ' ')}
          </span>
        </div>
        <span className="text-sm font-bold text-garnier-800">{pct}%</span>
      </div>

      <h3 className="font-semibold text-garnier-800 mb-1">{goal.title}</h3>
      {goal.description && <p className="text-sm text-gray-500 mb-3">{goal.description}</p>}

      <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
        <div
          className={`h-2 rounded-full transition-all ${
            pct >= 80 ? 'bg-brand-500' : pct >= 50 ? 'bg-brand-300' : 'bg-amber-400'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex justify-between text-xs text-gray-400">
        <span>{goal.currentValue} / {goal.targetValue} {goal.unit}</span>
        {goal.dueDate && <span>Vence: {new Date(goal.dueDate).toLocaleDateString('es-CR')}</span>}
      </div>
    </div>
  );
};

const Performance = () => {
  const { user } = useAuth();
  const [goals,   setGoals]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    api.get(`/performance/goals/${user.id}`)
      .then(({ data }) => setGoals(data.data.goals))
      .catch(() => setError('No se pudieron cargar las metas.'))
      .finally(() => setLoading(false));
  }, [user.id]);

  return (
    <div className="p-8">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-1 h-7 bg-brand-500 rounded-full" />
        <h1 className="text-2xl font-bold text-garnier-800">Mis Metas</h1>
      </div>
      <p className="text-gray-500 text-sm mb-6 ml-3">OKRs y KPIs del período actual</p>

      {loading && <p className="text-gray-400">Cargando metas...</p>}
      {error   && <p className="text-red-500">{error}</p>}

      {!loading && !error && goals.length === 0 && (
        <div className="card text-center py-12 text-gray-400">
          <p className="text-4xl mb-3">🎯</p>
          <p>No tienes metas registradas aún.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {goals.map((g) => <GoalCard key={g.goalId} goal={g} />)}
      </div>
    </div>
  );
};

export default Performance;
