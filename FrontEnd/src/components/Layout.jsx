import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import logo from '../images/LogoGarnier.png';

const NAV_ALL = [
  { path: '/',              label: 'Inicio',         icon: 'fi-rr-home'            },
  { path: '/hr-assistant',  label: 'HR Assistant',   icon: 'fi-rr-comment-alt'     },
  { path: '/pulse-work',    label: 'Mi Clima',       icon: 'fi-rr-heart'           },
  { path: '/enps-form',     label: 'Encuesta eNPS',  icon: 'fi-rr-star'            },
  { path: '/performance',   label: 'Mis Metas',      icon: 'fi-rr-bullseye'        },
  { path: '/recognition',   label: 'Reconocimientos',icon: 'fi-rr-trophy'          },
  { path: '/feedback',      label: 'Feedback',       icon: 'fi-rr-comment-check'   },
];

const NAV_JEFATURA = [
  { path: '/team-dashboard', label: 'Dashboard Equipo', icon: 'fi-rr-chart-histogram' },
  { path: '/meetings',       label: 'Reuniones 1:1',    icon: 'fi-rr-users'           },
];

const NAV_RH = [
  { path: '/enps-dashboard',    label: 'Dashboard eNPS', icon: 'fi-rr-chart-line-up'    },
  { path: '/survey-management', label: 'Encuestas',      icon: 'fi-rr-document-signed'  },
  { path: '/escalations',       label: 'Escalaciones',   icon: 'fi-rr-bell'             },
  { path: '/rag-documents',     label: 'Gestión RAG',    icon: 'fi-rr-folder'           },
];

const ROLE_BADGE = {
  Funcionario: 'bg-brand-100  text-brand-700',
  Jefatura:    'bg-brand-200  text-brand-800',
  RH:          'bg-brand-500  text-white',
  Admin:       'bg-garnier-800 text-white',
};

const Layout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const role = user?.role ?? '';

  const extraNav =
    role === 'Admin'    ? [...NAV_JEFATURA, ...NAV_RH] :
    role === 'RH'       ? NAV_RH :
    role === 'Jefatura' ? NAV_JEFATURA :
    [];

  const navItems = [...NAV_ALL, ...extraNav];
  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ── Sidebar ──────────────────────────────────────────────── */}
      <aside className="w-64 bg-garnier-800 flex flex-col flex-shrink-0">

        {/* Logo */}
        <div className="px-6 py-5 border-b border-garnier-700 bg-garnier-900">
          <img src={logo} alt="Garnier & Garnier" className="h-12 w-auto object-contain" />
          <p className="text-gray-400 text-xs mt-2">Ecosistema Digital RH</p>
        </div>

        {/* Navegación */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map(({ path, label, icon }, i) => (
            <motion.div
              key={path}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05, duration: 0.25 }}
            >
              <NavLink
                to={path}
                end={path === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                    isActive
                      ? 'bg-brand-500 text-white font-medium shadow-sm'
                      : 'text-gray-300 hover:bg-garnier-700 hover:text-white'
                  }`
                }
              >
                <i className={`fi ${icon} text-base leading-none`} />
                {label}
              </NavLink>
            </motion.div>
          ))}
        </nav>

        {/* Usuario */}
        <div className="px-4 py-4 border-t border-garnier-700">
          <button
            onClick={() => navigate('/profile')}
            className="flex items-center gap-3 mb-3 w-full text-left group"
          >
            <div className="w-9 h-9 rounded-full bg-brand-500 group-hover:bg-brand-400 transition-colors flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">
                {user?.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-white text-sm font-semibold truncate group-hover:text-brand-300 transition-colors">{user?.name}</p>
              {user?.area_name && (
                <p className="text-gray-400 text-xs truncate">{user.area_name}</p>
              )}
            </div>
          </button>
          <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium mb-3 ${ROLE_BADGE[role] ?? 'bg-garnier-700 text-gray-200'}`}>
            {role}
          </span>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 text-gray-400 hover:text-white text-xs transition-colors"
          >
            <i className="fi fi-rr-sign-out-alt leading-none" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* ── Contenido principal ───────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto bg-gray-50">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
