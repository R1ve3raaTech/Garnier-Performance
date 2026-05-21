import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Swal from 'sweetalert2';
import api from '../../services/api';

const ROLES = [
  { id: 1, name: 'Funcionario' },
  { id: 2, name: 'Jefatura' },
  { id: 3, name: 'RH' },
  { id: 4, name: 'Admin' },
];

const ROLE_BADGE = {
  Funcionario: 'bg-blue-100 text-blue-700',
  Jefatura:    'bg-amber-100 text-amber-700',
  RH:          'bg-green-100 text-green-700',
  Admin:       'bg-garnier-800 text-white',
};

const PAGE_SIZE = 10;

const emptyForm = { name: '', email: '', password: '', position: '', hire_date: '', role_id: '1', area_id: '' };

export default function UserManagement() {
  const [users, setUsers]     = useState([]);
  const [areas, setAreas]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const handleSearch = (val) => { setSearch(val); setPage(1); };
  const [page, setPage]       = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm]       = useState(emptyForm);
  const [saving, setSaving]   = useState(false);

  const fetchUsers = async () => {
    try {
      const { data } = await api.get('/users');
      setUsers(data.data);
    } catch {
      Swal.fire('Error', 'No se pudieron cargar los usuarios', 'error');
    }
  };

  useEffect(() => {
    const load = async () => {
      await Promise.all([
        fetchUsers(),
        api.get('/areas').then(({ data }) => setAreas(data.data)),
      ]);
      setLoading(false);
    };
    load();
  }, []);

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.role.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/users', form);
      Swal.fire({ icon: 'success', title: 'Usuario creado', timer: 1500, showConfirmButton: false });
      setShowModal(false);
      setForm(emptyForm);
      fetchUsers();
    } catch (err) {
      Swal.fire('Error', err.response?.data?.message || 'No se pudo crear el usuario', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleRoleChange = async (userId, roleId) => {
    try {
      await api.put(`/users/${userId}/role`, { role_id: Number(roleId) });
      setUsers(prev => prev.map(u =>
        u.id === userId
          ? { ...u, role_id: Number(roleId), role: ROLES.find(r => r.id === Number(roleId))?.name }
          : u
      ));
    } catch (err) {
      Swal.fire('Error', err.response?.data?.message || 'No se pudo cambiar el rol', 'error');
    }
  };

  const handleDelete = async (user) => {
    const result = await Swal.fire({
      title: `¿Eliminar a ${user.name}?`,
      text: 'Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonText: 'Cancelar',
      confirmButtonText: 'Eliminar',
    });
    if (!result.isConfirmed) return;
    try {
      await api.delete(`/users/${user.id}`);
      setUsers(prev => prev.filter(u => u.id !== user.id));
      Swal.fire({ icon: 'success', title: 'Usuario eliminado', timer: 1500, showConfirmButton: false });
    } catch (err) {
      Swal.fire('Error', err.response?.data?.message || 'No se pudo eliminar el usuario', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-garnier-900">Gestión de Usuarios</h1>
          <p className="text-gray-500 text-sm mt-1">{users.length} usuarios registrados</p>
        </div>
        <button
          onClick={() => { setForm(emptyForm); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg font-medium text-sm transition-colors"
        >
          <i className="fi fi-rr-user-add leading-none" />
          Nuevo usuario
        </button>
      </div>

      {/* Búsqueda */}
      <div className="relative mb-4">
        <i className="fi fi-rr-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 leading-none" />
        <input
          type="text"
          placeholder="Buscar por nombre, correo o rol..."
          value={search}
          onChange={e => handleSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
        />
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Nombre</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Correo</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Área</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Puesto</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Rol</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Ingreso</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginated.map(user => (
                <motion.tr
                  key={user.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-xs font-bold">{user.name.charAt(0)}</span>
                      </div>
                      <span className="font-medium text-gray-800">{user.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{user.email}</td>
                  <td className="px-4 py-3 text-gray-600">{user.area_name}</td>
                  <td className="px-4 py-3 text-gray-600">{user.position}</td>
                  <td className="px-4 py-3">
                    <select
                      value={user.role_id}
                      onChange={e => handleRoleChange(user.id, e.target.value)}
                      className="text-xs font-medium px-2 py-1 rounded-full border-0 focus:ring-2 focus:ring-brand-400 cursor-pointer"
                      style={{ backgroundColor: 'transparent' }}
                    >
                      {ROLES.map(r => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                    <span className={`ml-1 inline-block text-xs px-2 py-0.5 rounded-full font-medium pointer-events-none ${ROLE_BADGE[user.role] ?? 'bg-gray-100 text-gray-600'}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {user.hire_date ? new Date(user.hire_date).toLocaleDateString('es-CR') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDelete(user)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Eliminar usuario"
                    >
                      <i className="fi fi-rr-trash leading-none" />
                    </button>
                  </td>
                </motion.tr>
              ))}
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-gray-400">
                    No se encontraron usuarios
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {filtered.length > PAGE_SIZE && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-sm text-gray-500">
              {Math.min(currentPage * PAGE_SIZE, filtered.length)} de {filtered.length} usuarios &nbsp;·&nbsp; Página {currentPage} de {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <i className="fi fi-rr-angle-left leading-none" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                    n === currentPage
                      ? 'bg-brand-500 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {n}
                </button>
              ))}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <i className="fi fi-rr-angle-right leading-none" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal nuevo usuario */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40"
              onClick={() => setShowModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg z-10"
            >
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-lg font-bold text-garnier-900">Nuevo usuario</h2>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                  <i className="fi fi-rr-cross leading-none" />
                </button>
              </div>

              <form onSubmit={handleCreate} className="px-6 py-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Nombre completo</label>
                    <input
                      required
                      type="text"
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Correo electrónico</label>
                    <input
                      required
                      type="email"
                      value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Contraseña temporal</label>
                    <input
                      required
                      type="password"
                      minLength={8}
                      value={form.password}
                      onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Puesto</label>
                    <input
                      required
                      type="text"
                      value={form.position}
                      onChange={e => setForm(f => ({ ...f, position: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Fecha de ingreso</label>
                    <input
                      required
                      type="date"
                      value={form.hire_date}
                      onChange={e => setForm(f => ({ ...f, hire_date: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Área</label>
                    <select
                      required
                      value={form.area_id}
                      onChange={e => setForm(f => ({ ...f, area_id: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                    >
                      <option value="">Seleccionar...</option>
                      {areas.map(a => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Rol</label>
                    <select
                      value={form.role_id}
                      onChange={e => setForm(f => ({ ...f, role_id: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                    >
                      {ROLES.map(r => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 px-4 py-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    {saving ? 'Creando...' : 'Crear usuario'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
