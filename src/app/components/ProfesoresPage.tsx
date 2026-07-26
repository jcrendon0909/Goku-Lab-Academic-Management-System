import React, { useEffect, useState, useMemo } from 'react';
import { apiFetch } from '../../services/api';
import { toast } from 'sonner';
import { useSyncDataReload } from '../../utils/dataSync';
import BackgroundVideo from './BackgroundVideo';

interface Profesor {
  idProfesor: string;
  nombre: string;
  telefono?: string;
  email?: string;
  fechaNacimiento?: string;
  tipoPago?: 'por_hora' | 'fijo_mensual';
  salarioPorHora?: number;
  salarioMensual?: number;
  estatus: 'Activo' | 'Inactivo';
  grupos?: any[];
  horasLaboradas?: number;
  salarioEstimado?: number;
  usuario?: string;
}

export function ProfesoresPage() {
  const [profesores, setProfesores] = useState<Profesor[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstatus, setFiltroEstatus] = useState<'Activo' | 'Inactivo' | 'Todos'>('Todos');
  const [sortConfig, setSortConfig] = useState<{ key: keyof Profesor; direction: 'asc' | 'desc' } | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [profesorEditando, setProfesorEditando] = useState<Profesor | null>(null);
  const [showModalCrear, setShowModalCrear] = useState(false);
  const [nuevoProfesor, setNuevoProfesor] = useState<Partial<Profesor>>({
    nombre: '',
    telefono: '',
    email: '',
    fechaNacimiento: '',
    tipoPago: 'fijo_mensual',
    salarioMensual: 0,
    salarioPorHora: 0,
    estatus: 'Activo',
  });
  const [crearUsuario, setCrearUsuario] = useState(false);
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');

  const [profesorExpandido, setProfesorExpandido] = useState<string | null>(null);
  const [gruposDelProfesor, setGruposDelProfesor] = useState<Record<string, any[]>>({});
  const [cargandoGrupos, setCargandoGrupos] = useState<Record<string, boolean>>({});

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const esAdmin = user?.rol === 'admin';

  const cargarProfesores = async () => {
    try {
      setCargando(true);
      const res = await apiFetch('/profesores');
      if (!res.ok) throw new Error('Error al cargar profesores');
      const data = await res.json();
      setProfesores(data);
    } catch (error) {
      toast.error('Error al cargar profesores');
      console.error(error);
    } finally {
      setCargando(false);
    }
  };

  const cargarUsuarios = async () => {
    try {
      const res = await apiFetch('/usuarios');
      const data = await res.json();
      if (res.ok) setUsuarios(data);
    } catch (error) {
      console.error('Error al cargar usuarios:', error);
    }
  };

  useEffect(() => {
    cargarProfesores();
    cargarUsuarios();
  }, []);

  useSyncDataReload(cargarProfesores);

  const cargarGruposDelProfesor = async (idProfesor: string) => {
    if (gruposDelProfesor[idProfesor]) return;
    setCargandoGrupos((prev) => ({ ...prev, [idProfesor]: true }));
    try {
      const res = await apiFetch(`/profesores/${idProfesor}/grupos`);
      if (!res.ok) throw new Error('Error al cargar grupos');
      const data = await res.json();
      setGruposDelProfesor((prev) => ({ ...prev, [idProfesor]: data }));
    } catch (error) {
      toast.error('Error al cargar grupos del profesor');
      console.error(error);
    } finally {
      setCargandoGrupos((prev) => ({ ...prev, [idProfesor]: false }));
    }
  };

  const toggleExpandirProfesor = (idProfesor: string) => {
    if (profesorExpandido === idProfesor) {
      setProfesorExpandido(null);
      return;
    }
    setProfesorExpandido(idProfesor);
    cargarGruposDelProfesor(idProfesor);
  };

  const obtenerUsuarioDeProfesor = (idProfesor: string) => {
    const usuarioEncontrado = usuarios.find((u) => u.idProfesor === idProfesor);
    return usuarioEncontrado ? usuarioEncontrado.usuario : null;
  };

  const eliminarProfesor = async (idProfesor: string) => {
    if (!confirm('¿Eliminar este profesor permanentemente? Esta acción no se puede deshacer.')) return;
    try {
      const res = await apiFetch(`/profesores/${idProfesor}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar');
      toast.success('✅ Profesor eliminado');
      cargarProfesores();
      cargarUsuarios();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleGuardar = async () => {
    if (!profesorEditando) return;
    try {
      const payload = { ...profesorEditando };
      delete payload.grupos;
      delete payload.horasLaboradas;
      delete payload.salarioEstimado;
      delete payload.usuario;

      const res = await apiFetch(`/profesores/${profesorEditando.idProfesor}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Error al actualizar');
      }
      toast.success('✅ Profesor actualizado');
      setShowModal(false);
      cargarProfesores();
      cargarUsuarios();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleCrear = async () => {
    try {
      if (!nuevoProfesor.nombre) {
        toast.error('El nombre es obligatorio');
        return;
      }

      const payload: any = {
        nombre: nuevoProfesor.nombre.trim(),
        telefono: nuevoProfesor.telefono || '',
        email: nuevoProfesor.email || '',
        fechaNacimiento: nuevoProfesor.fechaNacimiento || null,
        tipoPago: nuevoProfesor.tipoPago || 'fijo_mensual',
        salarioPorHora: nuevoProfesor.tipoPago === 'por_hora' ? (nuevoProfesor.salarioPorHora || 0) : 0,
        salarioMensual: nuevoProfesor.tipoPago === 'fijo_mensual' ? (nuevoProfesor.salarioMensual || 0) : 0,
        estatus: nuevoProfesor.estatus || 'Activo',
      };

      if (crearUsuario) {
        if (!usuario || !password) {
          toast.error('Usuario y contraseña son requeridos');
          return;
        }
        payload.crearUsuario = true;
        payload.usuario = usuario;
        payload.password = password;
      }

      const res = await apiFetch('/profesores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Error al crear');
      }

      toast.success('🎉 Profesor creado');
      setShowModalCrear(false);
      setNuevoProfesor({
        nombre: '',
        telefono: '',
        email: '',
        fechaNacimiento: '',
        tipoPago: 'fijo_mensual',
        salarioMensual: 0,
        salarioPorHora: 0,
        estatus: 'Activo',
      });
      setCrearUsuario(false);
      setUsuario('');
      setPassword('');
      cargarProfesores();
      cargarUsuarios();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const toggleEstatus = async (id: string) => {
    const prof = profesores.find((p) => p.idProfesor === id);
    if (!prof) return;
    const nuevoEstatus = prof.estatus === 'Activo' ? 'Inactivo' : 'Activo';
    if (!confirm(`¿${nuevoEstatus === 'Inactivo' ? 'Desactivar' : 'Activar'} a ${prof.nombre}?`)) return;
    try {
      const res = await apiFetch(`/profesores/${id}/estatus`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estatus: nuevoEstatus }),
      });
      if (!res.ok) throw new Error('Error al cambiar estatus');
      toast.success(`✅ Profesor ${nuevoEstatus.toLowerCase()}`);
      cargarProfesores();
      cargarUsuarios();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const requestSort = (key: keyof Profesor) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: keyof Profesor) => {
    if (!sortConfig || sortConfig.key !== key) return '⇅';
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  const profesoresFiltrados = useMemo(() => {
    let resultado = [...profesores];

    if (!esAdmin && user?.idProfesor) {
      resultado = resultado.filter((p) => p.idProfesor === user.idProfesor);
    }

    if (filtroEstatus !== 'Todos') {
      resultado = resultado.filter((p) => p.estatus === filtroEstatus);
    }
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      resultado = resultado.filter(
        (p) =>
          p.nombre.toLowerCase().includes(q) ||
          p.idProfesor.toLowerCase().includes(q)
      );
    }
    if (sortConfig) {
      resultado.sort((a, b) => {
        let aVal: any = a[sortConfig.key] ?? '';
        let bVal: any = b[sortConfig.key] ?? '';
        if (sortConfig.key === 'salarioMensual' || sortConfig.key === 'salarioPorHora') {
          aVal = Number(aVal);
          bVal = Number(bVal);
        }
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return resultado;
  }, [profesores, filtroEstatus, busqueda, sortConfig, esAdmin, user]);

  if (cargando) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-[#8B5CF6] mx-auto mb-4"></div>
          <p className="text-lg font-bold">🚀 Cargando profesores...</p>
        </div>
      </div>
    );
  }

  const decorativeVideos: { src: string; position: any }[] = [];

  return (
    <>
      <BackgroundVideo
        videoSrc="https://media.gokulab.mx/Galery/videos/gokulabanimado.mp4"
        decorativeVideos={decorativeVideos}
      >
        <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 md:px-8 h-full flex flex-col py-1 mt-[30px]">
          {/* Cabecera */}
          <div className="flex flex-col md:flex-row items-center justify-between mb-3 gap-2 flex-shrink-0">
            <h1 className="text-lg md:text-xl font-extrabold text-white drop-shadow-lg flex items-center gap-2">
              <span className="bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] p-1.5 rounded-full shadow-lg text-sm inline-flex items-center justify-center w-8 h-8">
                🧑‍🏫
              </span>
              <span className="bg-gradient-to-r from-[#A78BFA] via-[#8B5CF6] to-[#7C3AED] text-transparent bg-clip-text">
                Gestión de Profesores
              </span>
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <input
                  type="text"
                  placeholder="🔍 Buscar..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="border-2 border-white/30 rounded-full px-4 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] focus:border-transparent bg-white/80 backdrop-blur-sm w-32 sm:w-44 transition-all"
                />
              </div>
              <select
                value={filtroEstatus}
                onChange={(e) => setFiltroEstatus(e.target.value as any)}
                className="border-2 border-white/30 rounded-full px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] focus:border-transparent bg-white/80 backdrop-blur-sm cursor-pointer"
              >
                <option value="Todos">👥 Todos</option>
                <option value="Activo">🟢 Activos</option>
                <option value="Inactivo">🔴 Inactivos</option>
              </select>
              {esAdmin && (
                <button
                  onClick={() => setShowModalCrear(true)}
                  className="px-4 py-1.5 bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-white rounded-full text-sm font-bold hover:scale-105 transition-all shadow-lg hover:shadow-xl flex items-center gap-1.5"
                >
                  <span>✨</span> Crear
                </button>
              )}
            </div>
          </div>

          {/* Tabla */}
          <div className="bg-white/60 backdrop-blur-md rounded-2xl shadow-2xl overflow-hidden border border-white/20 flex-1 flex flex-col min-h-0 h-[60vh]">
            <div className="overflow-x-auto overflow-y-auto flex-1">
              <table className="w-full table-auto divide-y divide-gray-200 text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-white">
                    <th className="px-3 py-2 text-left text-sm font-bold uppercase tracking-wider cursor-pointer hover:bg-white/20 transition-colors whitespace-nowrap">
                      <div className="flex items-center gap-1" onClick={() => requestSort('idProfesor')}>
                        ID <span className="opacity-70">{getSortIcon('idProfesor')}</span>
                      </div>
                    </th>
                    <th className="px-3 py-2 text-left text-sm font-bold uppercase tracking-wider cursor-pointer hover:bg-white/20 transition-colors whitespace-nowrap min-w-[130px]">
                      <div className="flex items-center gap-1" onClick={() => requestSort('nombre')}>
                        Nombre <span className="opacity-70">{getSortIcon('nombre')}</span>
                      </div>
                    </th>
                    <th className="px-3 py-2 text-left text-sm font-bold uppercase tracking-wider cursor-pointer hover:bg-white/20 transition-colors whitespace-nowrap">
                      <div className="flex items-center gap-1" onClick={() => requestSort('telefono')}>
                        Teléfono <span className="opacity-70">{getSortIcon('telefono')}</span>
                      </div>
                    </th>
                    <th className="px-3 py-2 text-left text-sm font-bold uppercase tracking-wider cursor-pointer hover:bg-white/20 transition-colors whitespace-nowrap">
                      <div className="flex items-center gap-1" onClick={() => requestSort('tipoPago')}>
                        Tipo pago <span className="opacity-70">{getSortIcon('tipoPago')}</span>
                      </div>
                    </th>
                    <th className="px-3 py-2 text-left text-sm font-bold uppercase tracking-wider cursor-pointer hover:bg-white/20 transition-colors whitespace-nowrap">
                      <div className="flex items-center gap-1" onClick={() => requestSort('salarioMensual')}>
                        Salario <span className="opacity-70">{getSortIcon('salarioMensual')}</span>
                      </div>
                    </th>
                    <th className="px-3 py-2 text-left text-sm font-bold uppercase tracking-wider cursor-pointer hover:bg-white/20 transition-colors whitespace-nowrap">
                      <div className="flex items-center gap-1" onClick={() => requestSort('usuario')}>
                        Usuario <span className="opacity-70">{getSortIcon('usuario')}</span>
                      </div>
                    </th>
                    <th className="px-3 py-2 text-left text-sm font-bold uppercase tracking-wider cursor-pointer hover:bg-white/20 transition-colors whitespace-nowrap">
                      <div className="flex items-center gap-1" onClick={() => requestSort('estatus')}>
                        Estatus <span className="opacity-70">{getSortIcon('estatus')}</span>
                      </div>
                    </th>
                    <th className="px-3 py-2 text-right text-sm font-bold uppercase tracking-wider whitespace-nowrap">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white/50 divide-y divide-gray-200">
                  {profesoresFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-gray-500 italic">
                        🧐 No hay profesores que coincidan con tu búsqueda
                      </td>
                    </tr>
                  ) : (
                    profesoresFiltrados.map((prof, index) => {
                      const usuarioProf = obtenerUsuarioDeProfesor(prof.idProfesor);
                      const isExpanded = profesorExpandido === prof.idProfesor;
                      return (
                        <React.Fragment key={prof.idProfesor}>
                          <tr className={`hover:bg-white/60 transition-all duration-200 hover:shadow-md hover:scale-[1.002] ${index % 2 === 0 ? 'bg-white/30' : 'bg-white/10'}`}>
                            <td className="px-3 py-2 whitespace-nowrap font-mono text-sm text-gray-700">{prof.idProfesor}</td>
                            <td className="px-3 py-2 whitespace-nowrap font-medium text-gray-900">{prof.nombre}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700">{prof.telefono || '-'}</td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                prof.tipoPago === 'por_hora'
                                  ? 'bg-purple-100/80 text-purple-700'
                                  : 'bg-indigo-100/80 text-indigo-700'
                              }`}>
                                {prof.tipoPago === 'por_hora' ? 'Por hora' : 'Mensual'}
                              </span>
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700">
                              {prof.tipoPago === 'por_hora'
                                ? `$${prof.salarioPorHora || 0}/h`
                                : `$${prof.salarioMensual || 0}/mes`}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap font-mono text-sm text-gray-700">
                              {usuarioProf || <span className="text-gray-400">Sin usuario</span>}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                prof.estatus === 'Activo'
                                  ? 'bg-emerald-100/80 text-emerald-700'
                                  : 'bg-rose-100/80 text-rose-700'
                              }`}>
                                {prof.estatus === 'Activo' ? '🟢 Activo' : '🔴 Inactivo'}
                              </span>
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => toggleExpandirProfesor(prof.idProfesor)}
                                  className="p-1.5 rounded-lg hover:bg-gray-100/50 transition-all hover:scale-110"
                                >
                                  {isExpanded ? '▲' : '▼'}
                                </button>
                                {esAdmin && (
                                  <>
                                    <button
                                      onClick={() => { setProfesorEditando({ ...prof }); setShowModal(true); }}
                                      className="p-1.5 rounded-lg bg-[#8B5CF6]/10 hover:bg-[#8B5CF6]/20 text-[#8B5CF6] transition-all hover:scale-110 text-sm font-bold"
                                      title="Editar profesor"
                                    >
                                      ✏️
                                    </button>
                                    <button
                                      onClick={() => toggleEstatus(prof.idProfesor)}
                                      className={`p-1.5 rounded-lg transition-all hover:scale-110 text-sm font-medium ${
                                        prof.estatus === 'Activo'
                                          ? 'text-rose-600 hover:bg-rose-50'
                                          : 'text-emerald-600 hover:bg-emerald-50'
                                      }`}
                                      title={prof.estatus === 'Activo' ? 'Desactivar' : 'Activar'}
                                    >
                                      {prof.estatus === 'Activo' ? '⛔' : '🔄'}
                                    </button>
                                    <button
                                      onClick={() => eliminarProfesor(prof.idProfesor)}
                                      className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-all hover:scale-110"
                                      title="Eliminar profesor"
                                    >
                                      🗑️
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>

                          {isExpanded && (
                            <tr>
                              <td colSpan={8} className="px-4 py-3 bg-gradient-to-r from-gray-50/80 to-white/50">
                                <div className="space-y-2">
                                  <h4 className="font-bold text-gray-700 text-sm flex items-center gap-2">
                                    <span className="inline-block w-1 h-4 bg-[#8B5CF6] rounded-full"></span>
                                    📚 Grupos y alumnos de {prof.nombre}
                                  </h4>
                                  {cargandoGrupos[prof.idProfesor] ? (
                                    <div className="flex justify-center py-4">
                                      <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-[#8B5CF6]"></div>
                                    </div>
                                  ) : gruposDelProfesor[prof.idProfesor]?.length === 0 ? (
                                    <p className="text-sm text-gray-500 italic py-2">😅 Este profesor no tiene grupos activos.</p>
                                  ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                      {gruposDelProfesor[prof.idProfesor]?.map((grupo) => (
                                        <div key={grupo.IdGrupo} className="bg-white/90 p-3 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 border-l-4 border-l-[#8B5CF6]">
                                          <p className="font-bold text-sm text-gray-900 flex items-center gap-1">
                                            {grupo.nombreCurso}
                                            <span className="text-xs font-normal text-gray-400 ml-1">({grupo.IdGrupo})</span>
                                          </p>
                                          <p className="text-xs text-gray-600 flex items-center gap-1">
                                            <span>📅</span> {grupo.diaClase} {grupo.horaClase} - {grupo.duracionClase}
                                          </p>
                                          <p className="text-xs text-gray-600">
                                            👥 <span className="font-bold">{grupo.totalAlumnos || 0}</span> alumnos
                                          </p>
                                          {grupo.alumnos && grupo.alumnos.length > 0 && (
                                            <div className="mt-2">
                                              <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Alumnos:</p>
                                              <ul className="flex flex-wrap gap-1 mt-1">
                                                {grupo.alumnos.map((alumno: any) => (
                                                  <li key={alumno.idAlumno} className="bg-gray-100/80 px-2 py-0.5 rounded-full text-xs text-gray-700">
                                                    {alumno.nombreAlumno}
                                                  </li>
                                                ))}
                                              </ul>
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Modal Editar */}
          {esAdmin && showModal && profesorEditando && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border-4 border-[#8B5CF6] animate-in zoom-in-95 duration-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#8B5CF6] to-[#7C3AED] rounded-full flex items-center justify-center text-2xl">
                    ✏️
                  </div>
                  <h3 className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED]">
                    Editar Profesor
                  </h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre *</label>
                    <input
                      type="text"
                      value={profesorEditando.nombre}
                      onChange={(e) => setProfesorEditando({ ...profesorEditando, nombre: e.target.value })}
                      className="w-full border-2 border-[#8B5CF6]/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] focus:border-transparent bg-white/90"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Teléfono</label>
                    <input
                      type="text"
                      value={profesorEditando.telefono || ''}
                      onChange={(e) => setProfesorEditando({ ...profesorEditando, telefono: e.target.value })}
                      className="w-full border-2 border-[#8B5CF6]/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] focus:border-transparent bg-white/90"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={profesorEditando.email || ''}
                      onChange={(e) => setProfesorEditando({ ...profesorEditando, email: e.target.value })}
                      className="w-full border-2 border-[#8B5CF6]/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] focus:border-transparent bg-white/90"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Tipo de pago</label>
                    <select
                      value={profesorEditando.tipoPago || 'fijo_mensual'}
                      onChange={(e) => setProfesorEditando({ ...profesorEditando, tipoPago: e.target.value as any })}
                      className="w-full border-2 border-[#8B5CF6]/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] focus:border-transparent bg-white/90"
                    >
                      <option value="fijo_mensual">Mensual fijo</option>
                      <option value="por_hora">Por hora</option>
                    </select>
                  </div>
                  {profesorEditando.tipoPago === 'fijo_mensual' ? (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Salario mensual</label>
                      <input
                        type="number"
                        value={profesorEditando.salarioMensual || 0}
                        onChange={(e) => setProfesorEditando({ ...profesorEditando, salarioMensual: parseFloat(e.target.value) || 0 })}
                        className="w-full border-2 border-[#8B5CF6]/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] focus:border-transparent bg-white/90"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Salario por hora</label>
                      <input
                        type="number"
                        value={profesorEditando.salarioPorHora || 0}
                        onChange={(e) => setProfesorEditando({ ...profesorEditando, salarioPorHora: parseFloat(e.target.value) || 0 })}
                        className="w-full border-2 border-[#8B5CF6]/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] focus:border-transparent bg-white/90"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Estatus</label>
                    <select
                      value={profesorEditando.estatus}
                      onChange={(e) => setProfesorEditando({ ...profesorEditando, estatus: e.target.value as any })}
                      className="w-full border-2 border-[#8B5CF6]/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] focus:border-transparent bg-white/90"
                    >
                      <option value="Activo">Activo</option>
                      <option value="Inactivo">Inactivo</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-6 pt-4 border-t-2 border-gray-100">
                  <button
                    onClick={() => setShowModal(false)}
                    className="px-5 py-2 border-2 border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all hover:scale-105"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleGuardar}
                    className="px-6 py-2 bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-white rounded-xl text-sm font-bold transition-all shadow-lg hover:shadow-xl hover:scale-105"
                  >
                    Guardar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal Crear */}
          {esAdmin && showModalCrear && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border-4 border-[#8B5CF6] animate-in zoom-in-95 duration-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#8B5CF6] to-[#7C3AED] rounded-full flex items-center justify-center text-2xl">
                    ✨
                  </div>
                  <h3 className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED]">
                    Crear Profesor
                  </h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre *</label>
                    <input
                      type="text"
                      value={nuevoProfesor.nombre || ''}
                      onChange={(e) => setNuevoProfesor({ ...nuevoProfesor, nombre: e.target.value })}
                      className="w-full border-2 border-[#8B5CF6]/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] focus:border-transparent bg-white/90"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Teléfono</label>
                    <input
                      type="text"
                      value={nuevoProfesor.telefono || ''}
                      onChange={(e) => setNuevoProfesor({ ...nuevoProfesor, telefono: e.target.value })}
                      className="w-full border-2 border-[#8B5CF6]/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] focus:border-transparent bg-white/90"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={nuevoProfesor.email || ''}
                      onChange={(e) => setNuevoProfesor({ ...nuevoProfesor, email: e.target.value })}
                      className="w-full border-2 border-[#8B5CF6]/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] focus:border-transparent bg-white/90"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Fecha de nacimiento</label>
                    <input
                      type="date"
                      value={nuevoProfesor.fechaNacimiento || ''}
                      onChange={(e) => setNuevoProfesor({ ...nuevoProfesor, fechaNacimiento: e.target.value })}
                      className="w-full border-2 border-[#8B5CF6]/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] focus:border-transparent bg-white/90"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Tipo de pago</label>
                    <select
                      value={nuevoProfesor.tipoPago || 'fijo_mensual'}
                      onChange={(e) => setNuevoProfesor({ ...nuevoProfesor, tipoPago: e.target.value as any })}
                      className="w-full border-2 border-[#8B5CF6]/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] focus:border-transparent bg-white/90"
                    >
                      <option value="fijo_mensual">Mensual fijo</option>
                      <option value="por_hora">Por hora</option>
                    </select>
                  </div>
                  {nuevoProfesor.tipoPago === 'fijo_mensual' ? (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Salario mensual</label>
                      <input
                        type="number"
                        value={nuevoProfesor.salarioMensual || 0}
                        onChange={(e) => setNuevoProfesor({ ...nuevoProfesor, salarioMensual: parseFloat(e.target.value) || 0 })}
                        className="w-full border-2 border-[#8B5CF6]/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] focus:border-transparent bg-white/90"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Salario por hora</label>
                      <input
                        type="number"
                        value={nuevoProfesor.salarioPorHora || 0}
                        onChange={(e) => setNuevoProfesor({ ...nuevoProfesor, salarioPorHora: parseFloat(e.target.value) || 0 })}
                        className="w-full border-2 border-[#8B5CF6]/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] focus:border-transparent bg-white/90"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Estatus</label>
                    <select
                      value={nuevoProfesor.estatus || 'Activo'}
                      onChange={(e) => setNuevoProfesor({ ...nuevoProfesor, estatus: e.target.value as any })}
                      className="w-full border-2 border-[#8B5CF6]/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] focus:border-transparent bg-white/90"
                    >
                      <option value="Activo">Activo</option>
                      <option value="Inactivo">Inactivo</option>
                    </select>
                  </div>

                  <div className="border-t-2 border-[#8B5CF6]/20 pt-4 mt-4">
                    <h3 className="text-md font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <span>🔐</span> Crear usuario para este profesor (opcional)
                    </h3>
                    <div className="flex items-center gap-2 mb-3">
                      <input
                        type="checkbox"
                        id="crearUsuario"
                        checked={crearUsuario}
                        onChange={(e) => setCrearUsuario(e.target.checked)}
                        className="h-5 w-5 rounded border-2 border-[#8B5CF6]/30 text-[#8B5CF6] focus:ring-[#8B5CF6]"
                      />
                      <label htmlFor="crearUsuario" className="text-sm font-medium text-gray-700">
                        Crear usuario
                      </label>
                    </div>
                    {crearUsuario && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border-2 border-[#8B5CF6]/20">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Usuario *</label>
                          <input
                            type="text"
                            placeholder="Ej. juan.perez"
                            value={usuario}
                            onChange={(e) => setUsuario(e.target.value)}
                            className="w-full border-2 border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] bg-white/80"
                            required={crearUsuario}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña *</label>
                          <input
                            type="password"
                            placeholder="********"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full border-2 border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] bg-white/80"
                            required={crearUsuario}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-6 pt-4 border-t-2 border-gray-100">
                  <button
                    onClick={() => setShowModalCrear(false)}
                    className="px-5 py-2 border-2 border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all hover:scale-105"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleCrear}
                    className="px-6 py-2 bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-white rounded-xl text-sm font-bold transition-all shadow-lg hover:shadow-xl hover:scale-105"
                  >
                    Crear profesor
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </BackgroundVideo>
    </>
  );
}