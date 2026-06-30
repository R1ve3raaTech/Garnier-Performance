import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import gsap from 'gsap';
import { useAuth } from '../../context/AuthContext';

const ROLE_CARDS = {
  Funcionario: [
    { icon: 'fi-rr-comment-alt', title: 'HR Assistant',  desc: 'Consulta políticas y beneficios',  path: '/hr-assistant', color: 'bg-blue-50   border-blue-100'  },
    { icon: 'fi-rr-heart',       title: 'Mi Clima',      desc: 'Registra tu pulso diario',         path: '/pulse-work',   color: 'bg-green-50  border-green-100' },
    { icon: 'fi-rr-bullseye',    title: 'Mis Metas',     desc: 'Revisa tus OKRs y KPIs',          path: '/performance',  color: 'bg-brand-50  border-brand-100' },
  ],
  Jefatura: [
    { icon: 'fi-rr-comment-alt',       title: 'HR Assistant',     desc: 'Consulta políticas',                path: '/hr-assistant',   color: 'bg-blue-50   border-blue-100'   },
    { icon: 'fi-rr-chart-histogram',   title: 'Dashboard Equipo', desc: 'Alertas de bienestar del área',     path: '/team-dashboard', color: 'bg-purple-50 border-purple-100' },
    { icon: 'fi-rr-users',             title: 'Reuniones 1:1',    desc: 'Prepara agendas con IA',           path: '/meetings',       color: 'bg-amber-50  border-amber-100'  },
    { icon: 'fi-rr-bullseye',          title: 'Metas del Equipo', desc: 'Progreso de colaboradores',        path: '/performance',    color: 'bg-brand-50  border-brand-100'  },
  ],
  RH: [
    { icon: 'fi-rr-chart-line-up',  title: 'Dashboard eNPS',  desc: 'Resumen ejecutivo de encuestas',       path: '/enps-dashboard', color: 'bg-indigo-50  border-indigo-100' },
    { icon: 'fi-rr-chart-histogram',title: 'Clima Laboral',   desc: 'Alertas de bienestar por área',        path: '/team-dashboard', color: 'bg-purple-50  border-purple-100'},
    { icon: 'fi-rr-folder',         title: 'Gestión RAG',     desc: 'Base de conocimiento',                 path: '/rag-documents',  color: 'bg-amber-50   border-amber-100' },
    { icon: 'fi-rr-comment-alt',    title: 'HR Assistant',    desc: 'Asistente corporativo',                path: '/hr-assistant',   color: 'bg-blue-50    border-blue-100'  },
  ],
  Admin: [
    { icon: 'fi-rr-comment-alt',      title: 'HR Assistant',    desc: 'Asistente corporativo',  path: '/hr-assistant',   color: 'bg-blue-50   border-blue-100'   },
    { icon: 'fi-rr-chart-line-up',    title: 'Dashboard eNPS',  desc: 'Resumen ejecutivo',      path: '/enps-dashboard', color: 'bg-indigo-50 border-indigo-100' },
    { icon: 'fi-rr-chart-histogram',  title: 'Dashboard Equipo',desc: 'Bienestar por área',     path: '/team-dashboard', color: 'bg-purple-50 border-purple-100' },
    { icon: 'fi-rr-folder',           title: 'Gestión RAG',     desc: 'Base de conocimiento',   path: '/rag-documents',  color: 'bg-amber-50  border-amber-100'  },
  ],
};

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 24 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const cards    = ROLE_CARDS[user?.role] ?? ROLE_CARDS.Funcionario;
  const hour     = new Date().getHours();
  const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches';
  const iconRefs = useRef({});

  const handleIconEnter = (path) => {
    gsap.to(iconRefs.current[path], { scale: 1.15, rotate: 6, duration: 0.35, ease: 'back.out(2.5)' });
  };
  const handleIconLeave = (path) => {
    gsap.to(iconRefs.current[path], { scale: 1, rotate: 0, duration: 0.3, ease: 'power2.out' });
  };

  return (
    <motion.div
      className="p-8 overflow-x-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Bienvenida */}
      <motion.div
        className="mb-8"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center gap-2 mb-1">
          <div className="w-1 h-8 bg-brand-500 rounded-full" />
          <h1 className="text-2xl font-bold text-garnier-800">
            {greeting}, {user?.name?.split(' ')[0]} 👋
          </h1>
        </div>
        <p className="text-gray-500 ml-3">Garnier · {user?.area_name} · {user?.role}</p>
      </motion.div>

      {/* Cards */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 min-w-0"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {cards.map(({ icon, title, desc, path, color }) => (
          <motion.button
            key={path}
            variants={item}
            onClick={() => navigate(path)}
            onMouseEnter={() => handleIconEnter(path)}
            onMouseLeave={() => handleIconLeave(path)}
            whileHover={{ scale: 1.03, boxShadow: '0 8px 30px rgba(0,0,0,0.10)' }}
            whileTap={{ scale: 0.97 }}
            className={`card text-left border-2 transition-colors group min-w-0 ${color} hover:border-brand-300`}
          >
            <div
              ref={(el) => { iconRefs.current[path] = el; }}
              className="w-11 h-11 rounded-xl bg-white shadow-sm flex items-center justify-center mb-4"
            >
              <i className={`fi ${icon} text-xl text-brand-500 leading-none`} />
            </div>
            <h3 className="font-semibold text-garnier-800 group-hover:text-brand-600 transition-colors truncate">
              {title}
            </h3>
            <p className="text-sm text-gray-500 mt-1 truncate">{desc}</p>
          </motion.button>
        ))}
      </motion.div>
    </motion.div>
  );
};

export default Dashboard;
