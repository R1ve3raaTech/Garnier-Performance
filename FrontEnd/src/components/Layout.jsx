import { useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import gsap from 'gsap';
import { useAuth } from '../context/AuthContext';
import logo from '../images/LogoGarnier.png';

const NAV_GENERAL = [
  { path: '/',              label: 'Inicio',          icon: 'fi-rr-home'          },
  { path: '/hr-assistant',  label: 'HR Assistant',    icon: 'fi-rr-comment-alt'   },
  { path: '/pulse-work',    label: 'Mi Clima',        icon: 'fi-rr-heart'         },
  { path: '/enps-form',     label: 'Encuesta eNPS',   icon: 'fi-rr-star'          },
  { path: '/performance',   label: 'Mis Metas',       icon: 'fi-rr-bullseye'      },
  { path: '/recognition',   label: 'Reconocimientos', icon: 'fi-rr-trophy'        },
  { path: '/feedback',      label: 'Feedback',        icon: 'fi-rr-comment-check' },
];

const NAV_JEFATURA = [
  { path: '/team-dashboard', label: 'Dashboard Equipo', icon: 'fi-rr-chart-histogram' },
  { path: '/meetings',       label: 'Reuniones 1:1',    icon: 'fi-rr-users'           },
];

const NAV_RH = [
  { path: '/enps-dashboard',    label: 'Dashboard eNPS', icon: 'fi-rr-chart-line-up'   },
  { path: '/survey-management', label: 'Encuestas',      icon: 'fi-rr-document-signed' },
  { path: '/escalations',       label: 'Escalaciones',   icon: 'fi-rr-bell'            },
  { path: '/rag-documents',     label: 'Gestión RAG',    icon: 'fi-rr-folder'          },
];

const NAV_ADMIN = [
  { path: '/user-management', label: 'Usuarios',              icon: 'fi-rr-users-alt'  },
  { path: '/signup-requests', label: 'Solicitudes de Registro', icon: 'fi-rr-user-add' },
];

const ROLE_BADGE = {
  Funcionario: 'bg-brand-100  text-brand-700',
  Jefatura:    'bg-brand-200  text-brand-800',
  RH:          'bg-brand-500  text-white',
  Admin:       'bg-garnier-800 text-white',
};

const isActivePath = (pathname, path) =>
  path === '/' ? pathname === '/' : pathname.startsWith(path);

const Layout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const role = user?.role ?? '';

  const sections = [
    { label: null, items: NAV_GENERAL },
    ...(role === 'Admin'    ? [{ label: 'Equipo', items: NAV_JEFATURA }, { label: 'Recursos Humanos', items: NAV_RH }, { label: 'Administración', items: NAV_ADMIN }] :
        role === 'RH'       ? [{ label: 'Recursos Humanos', items: NAV_RH }] :
        role === 'Jefatura' ? [{ label: 'Equipo', items: NAV_JEFATURA }] :
        []),
  ];

  const navRef    = useRef(null);
  const pillRef   = useRef(null);
  const itemRefs  = useRef({});
  const mountedRef = useRef(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  useEffect(() => {
    const allItems  = sections.flatMap((s) => s.items);
    const activeItem = allItems.find(({ path }) => isActivePath(location.pathname, path));
    const el = activeItem && itemRefs.current[activeItem.path];
    if (!el || !pillRef.current || !navRef.current) return;

    const navBox = navRef.current.getBoundingClientRect();
    const elBox  = el.getBoundingClientRect();
    const top    = elBox.top - navBox.top + navRef.current.scrollTop;

    if (!mountedRef.current) {
      gsap.set(pillRef.current, { top, height: elBox.height, opacity: 1 });
      mountedRef.current = true;
    } else {
      gsap.to(pillRef.current, { top, height: elBox.height, duration: 0.45, ease: 'power3.out' });
    }
  }, [location.pathname, role]);

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
        <nav ref={navRef} className="relative flex-1 px-3 py-4 overflow-y-auto sidebar-scroll">
          {/* Indicador activo animado (GSAP) */}
          <div
            ref={pillRef}
            className="absolute left-3 right-3 rounded-lg bg-brand-500 shadow-sm opacity-0 pointer-events-none"
            style={{ zIndex: 0 }}
          />

          {sections.map(({ label, items }, sIdx) => (
            <div key={label ?? 'general'} className={sIdx > 0 ? 'mt-4' : ''}>
              {label && (
                <p className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                  {label}
                </p>
              )}
              <div className="space-y-0.5">
                {items.map(({ path, label: itemLabel, icon }) => (
                  <NavLink
                    key={path}
                    to={path}
                    end={path === '/'}
                    ref={(el) => { itemRefs.current[path] = el; }}
                    className={({ isActive }) =>
                      `relative z-10 flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors duration-200 ${
                        isActive
                          ? 'text-white font-medium'
                          : 'text-gray-300 hover:bg-garnier-700/60 hover:text-white'
                      }`
                    }
                  >
                    <i className={`fi ${icon} text-base leading-none`} />
                    {itemLabel}
                  </NavLink>
                ))}
              </div>
            </div>
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
      <main className="flex-1 overflow-y-auto overflow-x-hidden bg-gray-50">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
