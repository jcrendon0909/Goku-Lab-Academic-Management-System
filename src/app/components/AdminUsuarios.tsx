import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, UserPlus, Edit2, Trash2, Shield, User } from 'lucide-react';
import { apiFetch } from '../../services/api';
import { toast } from 'sonner';

interface Usuario {
  _id: string;
  usuario: string;
  nombreCompleto: string;
  rol: 'admin' | 'profesor' | 'recepcion';
  idProfesor?: string; // opcional, para vincular con profesor
}

export function AdminUsuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [editando, setEditando] = useState<Usuario | null>(null);

  // Estado del formulario
  const [formUsuario, setFormUsuario] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formNombre, setFormNombre] = useState('');
  const [formRol, setFormRol] = useState<'admin' | 'profesor'>('profesor');
  const [formIdProfesor, setFormIdProfesor] = useState('');

  const cargarUsuarios = async () => {
    try {
      const res = await apiFetch('/usuarios');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al cargar usuarios');
      setUsuarios(data);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarUsuarios();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        usuario: formUsuario,
        password: formPassword,
        nombreCompleto: formNombre,
        rol: formRol,
        idProfesor: formIdProfesor || undefined,
      };

      const res = await apiFetch('/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al crear usuario');
      
      toast.success('Usuario creado correctamente');
      setMostrarFormulario(false);
      resetForm();
      cargarUsuarios();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const resetForm = () => {
    setFormUsuario('');
    setFormPassword('');
    setFormNombre('');
    setFormRol('profesor');
    setFormIdProfesor('');
    setEditando(null);
  };

  const handleEliminar = async (id: string) => {
    if (!confirm('¿Eliminar este usuario?')) return;
    try {
      const res = await apiFetch(`/usuarios/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar');
      toast.success('Usuario eliminado');
      cargarUsuarios();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  if (cargando) return <div className="p-8 text-center">Cargando...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="text-gray-600 hover:text-gray-900">
              <ArrowLeft className="h-6 w-6" />
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Administrar Usuarios</h1>
          </div>
          <button
            onClick={() => {
              setMostrarFormulario(!mostrarFormulario);
              resetForm();
            }}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700"
          >
            <UserPlus className="h-5 w-5" />
            Nuevo Usuario
          </button>
        </div>

        {/* Formulario de creación/edición */}
        {mostrarFormulario && (
          <div className="bg-white rounded-xl shadow-md p-6 mb-6 border border-gray-200">
            <h2 className="text-lg font-semibold mb-4">
              {editando ? 'Editar Usuario' : 'Crear Nuevo Usuario'}
            </h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Usuario</label>
                <input
                  type="text"
                  value={formUsuario}
                  onChange={(e) => setFormUsuario(e.target.value)}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Contraseña</label>
                <input
                  type="password"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2"
                  required={!editando}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Nombre Completo</label>
                <input
                  type="text"
                  value={formNombre}
                  onChange={(e) => setFormNombre(e.target.value)}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Rol</label>
                <select
                  value={formRol}
                  onChange={(e) => setFormRol(e.target.value as 'admin' | 'profesor')}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="admin">Administrador</option>
                  <option value="profesor">Profesor</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700">
                  ID Profesor (opcional, solo si el usuario es profesor)
                </label>
                <input
                  type="text"
                  value={formIdProfesor}
                  onChange={(e) => setFormIdProfesor(e.target.value)}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="Ej: PROF001"
                />
              </div>
              <div className="col-span-2 flex gap-3 pt-2">
                <button
                  type="submit"
                  className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700"
                >
                  {editando ? 'Actualizar' : 'Crear'}
                </button>
                <button
                  type="button"
                  onClick={() => { setMostrarFormulario(false); resetForm(); }}
                  className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Lista de usuarios */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuario</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rol</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID Profesor</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {usuarios.map((u) => (
                <tr key={u._id}>
                  <td className="px-6 py-4 text-sm text-gray-900">{u.usuario}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{u.nombreCompleto}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      u.rol === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {u.rol}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{u.idProfesor || '—'}</td>
                  <td className="px-6 py-4 text-sm text-right space-x-2">
                    <button
                      onClick={() => {
                        setEditando(u);
                        setFormUsuario(u.usuario);
                        setFormNombre(u.nombreCompleto);
                        setFormRol(u.rol);
                        setFormIdProfesor(u.idProfesor || '');
                        setMostrarFormulario(true);
                      }}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      <Edit2 className="h-4 w-4 inline" />
                    </button>
                    <button
                      onClick={() => handleEliminar(u._id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="h-4 w-4 inline" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}