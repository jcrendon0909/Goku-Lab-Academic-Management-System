import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, UserPlus, Edit2, Trash2, Key, Shield, User, Users, RefreshCw } from 'lucide-react';
import { apiFetch, resetPasswordPorAdmin, getProfesores } from '../../services/api';
import { toast } from 'sonner';
import BackgroundVideo from './BackgroundVideo';

interface Usuario {
  _id: string;
  usuario: string;
  nombreCompleto: string;
  rol: 'admin' | 'profesor' | 'recepcion';
  idProfesor?: string;
}

interface Profesor {
  idProfesor: string;
  nombre: string;
  estatus: string;
}

export function AdminUsuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [profesores, setProfesores] = useState<Profesor[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [editando, setEditando] = useState<Usuario | null>(null);

  const [formUsuario, setFormUsuario] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formNombre, setFormNombre] = useState('');
  const [formRol, setFormRol] = useState<'admin' | 'profesor' | 'recepcion'>('profesor');
  const [formIdProfesor, setFormIdProfesor] = useState('');

  const cargarDatos = async () => {
    try {
      setCargando(true);
      const [usuariosRes, profesoresRes] = await Promise.all([
        apiFetch('/usuarios'),
        getProfesores(),
      ]);
      const usuariosData = await usuariosRes.json();
      if (!usuariosRes.ok) throw new Error(usuariosData.error || 'Error al cargar usuarios');
      setUsuarios(usuariosData);
      setProfesores(Array.isArray(profesoresRes) ? profesoresRes : []);
      console.log('✅ Profesores cargados en estado:', profesoresRes.length);
    } catch (error: any) {
      console.error('❌ Error en cargarDatos:', error);
      toast.error(error.message);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const resetForm = () => {
    setFormUsuario('');
    setFormPassword('');
    setFormNombre('');
    setFormRol('profesor');
    setFormIdProfesor('');
    setEditando(null);
  };

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
      
      toast.success('✅ Usuario creado correctamente');
      setMostrarFormulario(false);
      resetForm();
      cargarDatos();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleEdit = (usuario: Usuario) => {
    setEditando(usuario);
    setFormUsuario(usuario.usuario);
    setFormNombre(usuario.nombreCompleto);
    setFormRol(usuario.rol);
    setFormIdProfesor(usuario.idProfesor || '');
    setMostrarFormulario(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editando) return;
    try {
      const payload = {
        nombreCompleto: formNombre,
        rol: formRol,
        idProfesor: formIdProfesor || '',
      };

      const res = await apiFetch(`/usuarios/${editando._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al actualizar usuario');
      
      toast.success('✅ Usuario actualizado correctamente');
      setMostrarFormulario(false);
      resetForm();
      cargarDatos();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleEliminar = async (id: string) => {
    if (!confirm('¿Eliminar este usuario?')) return;
    try {
      const res = await apiFetch(`/usuarios/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar');
      toast.success('✅ Usuario eliminado');
      cargarDatos();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleResetPassword = async (userId: string, usuario: string) => {
    if (!confirm(`¿Generar enlace de restablecimiento para ${usuario}?`)) return;
    try {
      const token = await resetPasswordPorAdmin(userId);
      const resetLink = `https://horarios.gokulab.mx/reset-password?token=${token}`;
      window.prompt(`🔑 Enlace para ${usuario}:`, resetLink);
      toast.success('Token generado correctamente.');
    } catch (error: any) {
      toast.error(error.message || 'Error al generar token');
    }
  };

  // Decoración: videos decorativos (ninguno)
  const decorativeVideos: { src: string; position: any }[] = [];

  if (cargando) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-[#8B5CF6] mx-auto mb-4"></div>
          <p className="text-lg font-bold">👥 Cargando usuarios...</p>
        </div>
      </div>
    );
  }

  return (
    <BackgroundVideo
      videoSrc="https://media.gokulab.mx/Galery/videos/cloudyanimado.mp4" // ✅ Video actualizado
      decorativeVideos={decorativeVideos}
    >
      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 md:px-8 h-full flex flex-col py-1 mt-[30px]">
        {/* Cabecera */}
        <div className="flex flex-col md:flex-row items-center justify-between mb-5 gap-3 flex-shrink-0">
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="bg-white/20 backdrop-blur-sm p-2 rounded-full hover:bg-white/30 transition-all hover:scale-110">
              <ArrowLeft className="h-5 w-5 text-white" />
            </Link>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white drop-shadow-lg flex items-center gap-3">
              <span className="bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] p-2 rounded-full shadow-lg inline-flex items-center justify-center">
                <Shield className="h-6 w-6 text-white" />
              </span>
              <span className="bg-gradient-to-r from-[#A78BFA] via-[#8B5CF6] to-[#7C3AED] text-transparent bg-clip-text">
                Administrar Usuarios
              </span>
            </h1>
          </div>
          <button
            onClick={() => {
              setMostrarFormulario(!mostrarFormulario);
              resetForm();
            }}
            className="bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-white px-5 py-2 rounded-full font-bold hover:scale-105 transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
          >
            <UserPlus className="h-5 w-5" />
            Nuevo Usuario
          </button>
        </div>

        {/* Formulario (neumorfismo) */}
        {mostrarFormulario && (
          <div className="bg-white/20 backdrop-blur-md rounded-2xl p-6 mb-6 border border-white/20 shadow-xl flex-shrink-0">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              {editando ? (
                <>
                  <Edit2 className="h-5 w-5 text-[#F8B50E]" />
                  Editar Usuario
                </>
              ) : (
                <>
                  <UserPlus className="h-5 w-5 text-[#F8B50E]" />
                  Crear Nuevo Usuario
                </>
              )}
            </h2>
            <form onSubmit={editando ? handleUpdate : handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white/80">Usuario</label>
                <input
                  type="text"
                  value={formUsuario}
                  onChange={(e) => setFormUsuario(e.target.value)}
                  className="mt-1 w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-2.5 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] focus:border-transparent transition"
                  placeholder="ej. juan.perez"
                  required
                  disabled={!!editando}
                />
              </div>
              {!editando && (
                <div>
                  <label className="block text-sm font-medium text-white/80">Contraseña</label>
                  <input
                    type="password"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    className="mt-1 w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-2.5 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] focus:border-transparent transition"
                    placeholder="********"
                    required={!editando}
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-white/80">Nombre Completo</label>
                <input
                  type="text"
                  value={formNombre}
                  onChange={(e) => setFormNombre(e.target.value)}
                  className="mt-1 w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-2.5 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] focus:border-transparent transition"
                  placeholder="Juan Pérez"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/80">Rol</label>
                <select
                  value={formRol}
                  onChange={(e) => setFormRol(e.target.value as 'admin' | 'profesor' | 'recepcion')}
                  className="mt-1 w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] focus:border-transparent transition"
                >
                  <option value="admin" className="text-gray-900">Administrador</option>
                  <option value="profesor" className="text-gray-900">Profesor</option>
                  <option value="recepcion" className="text-gray-900">Recepción</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-white/80">
                  Vincular con profesor
                </label>
                {profesores.length === 0 ? (
                  <div className="mt-1 text-yellow-300 text-sm flex items-center gap-2">
                    <span>⚠️</span> No hay profesores disponibles
                  </div>
                ) : (
                  <>
                    <select
                      key={`select-${profesores.length}`}
                      value={formIdProfesor}
                      onChange={(e) => setFormIdProfesor(e.target.value)}
                      className="mt-1 w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] focus:border-transparent transition"
                    >
                      <option value="" className="text-gray-900">— Sin vincular —</option>
                      {profesores.map((p) => (
                        <option key={p.idProfesor} value={p.idProfesor} className="text-gray-900">
                          {p.idProfesor} - {p.nombre} ({p.estatus || 'Activo'})
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-green-300 mt-1 flex items-center gap-1">
                      <span>✅</span> {profesores.length} profesores disponibles
                    </p>
                  </>
                )}
              </div>
              <div className="col-span-2 flex gap-3 pt-2">
                <button
                  type="submit"
                  className="bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-white px-6 py-2 rounded-full font-bold hover:scale-105 transition-all shadow-lg"
                >
                  {editando ? 'Actualizar' : 'Crear Usuario'}
                </button>
                <button
                  type="button"
                  onClick={() => { setMostrarFormulario(false); resetForm(); }}
                  className="bg-white/20 backdrop-blur-sm text-white px-6 py-2 rounded-full font-medium hover:bg-white/30 transition-all border border-white/20"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tabla de usuarios */}
        <div className="bg-white/20 backdrop-blur-md rounded-2xl overflow-hidden border border-white/20 shadow-xl flex-1 flex flex-col min-h-0">
          <div className="overflow-x-auto overflow-y-auto flex-1">
            <table className="w-full table-auto divide-y divide-white/10 text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-white">
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Usuario</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Nombre</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Rol</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">ID Profesor</th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {usuarios.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-white/60 italic">
                      🧐 No hay usuarios registrados
                    </td>
                  </tr>
                ) : (
                  usuarios.map((u, index) => (
                    <tr
                      key={u._id}
                      className={`hover:bg-white/10 transition-colors ${
                        index % 2 === 0 ? 'bg-white/5' : 'bg-white/0'
                      }`}
                    >
                      <td className="px-4 py-3 whitespace-nowrap font-mono text-sm text-white/90">{u.usuario}</td>
                      <td className="px-4 py-3 whitespace-nowrap font-medium text-white">{u.nombreCompleto}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                          u.rol === 'admin' ? 'bg-purple-500/80 text-white' :
                          u.rol === 'profesor' ? 'bg-blue-500/80 text-white' :
                          'bg-gray-500/80 text-white'
                        }`}>
                          {u.rol === 'admin' ? <Shield className="h-3 w-3" /> :
                           u.rol === 'profesor' ? <User className="h-3 w-3" /> :
                           <Users className="h-3 w-3" />}
                          {u.rol}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-white/60 font-mono">
                        {u.idProfesor || '—'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleEdit(u)}
                            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-all hover:scale-110"
                            title="Editar usuario"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleResetPassword(u._id, u.usuario)}
                            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-yellow-300 hover:text-yellow-200 transition-all hover:scale-110"
                            title="Generar enlace para restablecer contraseña"
                          >
                            <Key className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleEliminar(u._id)}
                            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-rose-400 hover:text-rose-300 transition-all hover:scale-110"
                            title="Eliminar usuario"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pie de página */}
        <div className="mt-2 flex justify-between items-center text-xs text-white/50 flex-shrink-0">
          <span>👥 {usuarios.length} usuarios registrados</span>
          <span>
            <RefreshCw className="h-3 w-3 inline mr-1" />
            {new Date().toLocaleString()}
          </span>
        </div>
      </div>
    </BackgroundVideo>
  );
}