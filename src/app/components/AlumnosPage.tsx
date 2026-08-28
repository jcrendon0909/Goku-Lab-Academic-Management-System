import React, { useEffect, useState, useMemo } from 'react';
import { apiFetch, actualizarAlumno } from '../../services/api';
import { toast } from 'sonner';
import { useSyncDataReload } from '../../utils/dataSync';
import BackgroundVideo from './BackgroundVideo';
import InscripcionForm from './InscripcionForm';

// ----------------------------- INTERFACES -----------------------------
interface Alumno {
  idAlumno: string;
  nombreAlumno: string;
  telefono?: string;
  email?: string;
  estatus: string;
  origen?: string;
  situacion_percibida?: string;
  createdAt?: string;
  cursosActivos?: number;
}

interface Inscripcion {
  _id: string;
  idAlumno: string;
  nombreAlumno: string;
  grupoId: string;
  modalidad: string;
  montoMensualidad: number;
  diaPago: number;
  fechaInicioPago: string;
  comentarios: string;
  estatus: string;
  fechaInscripcion: string;
  createdAt: string;
}

interface Grupo {
  IdGrupo: string;
  nombreCurso: string;
  diaClase: string;
  horaClase: string;
  nombreProfesor: string;
  CapacidadMaxima: number;
  alumnosInscritos?: number;
}

// ----------------------------- COMPONENTE PRINCIPAL -----------------------------
export function AlumnosPage() {
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstatus, setFiltroEstatus] = useState<'Activo' | 'Inactivo' | 'Todos'>('Activo');
  const [sortConfig, setSortConfig] = useState<{ key: keyof Alumno; direction: 'asc' | 'desc' } | null>(null);

  const [alumnoExpandido, setAlumnoExpandido] = useState<string | null>(null);
  const [inscripciones, setInscripciones] = useState<Record<string, Inscripcion[]>>({});
  const [cargandoInscripciones, setCargandoInscripciones] = useState<Record<string, boolean>>({});

  const [mostrarModalMover, setMostrarModalMover] = useState(false);
  const [inscripcionSeleccionada, setInscripcionSeleccionada] = useState<Inscripcion | null>(null);
  const [nuevoGrupoId, setNuevoGrupoId] = useState('');
  const [gruposDisponibles, setGruposDisponibles] = useState<Grupo[]>([]);
  const [alumnoActual, setAlumnoActual] = useState<Alumno | null>(null);

  const [todosLosGrupos, setTodosLosGrupos] = useState<Grupo[]>([]);
  const [showInscripcionForm, setShowInscripcionForm] = useState(false);
  const [alumnoParaInscripcion, setAlumnoParaInscripcion] = useState<{ 
    idAlumno: string; 
    nombreAlumno: string; 
    telefono?: string; 
    email?: string; 
    fechaNacimiento?: string; 
    tutor?: string; 
    descuento?: number; 
    notasInternas?: string; 
    observaciones?: string 
  } | null>(null);

  const [alumnoDraft, setAlumnoDraft] = useState<Record<string, Partial<Alumno>>>({});
  const [guardandoAlumno, setGuardandoAlumno] = useState<Record<string, boolean>>({});

  // ----------------------------- CARGA DE DATOS -----------------------------
  const cargarAlumnos = async () => {
    try {
      setCargando(true);
      const res = await apiFetch('/alumnos');
      const data = await res.json();
      setAlumnos(data);
    } catch (error) {
      toast.error('Error al cargar alumnos');
    } finally {
      setCargando(false);
    }
  };

  const cargarTodosLosGrupos = async () => {
    try {
      const res = await apiFetch('/grupos/con-ocupacion');
      if (!res.ok) throw new Error('Error al cargar grupos');
      const data = await res.json();
      setTodosLosGrupos(data);
    } catch (error) {
      console.error('Error al cargar grupos:', error);
    }
  };

  useEffect(() => {
    cargarAlumnos();
    cargarTodosLosGrupos();
  }, []);

  useSyncDataReload(cargarAlumnos);

  // ----------------------------- FUNCIONES UI -----------------------------
  const toggleExpandirAlumno = async (idAlumno: string) => {
    if (alumnoExpandido === idAlumno) {
      setAlumnoExpandido(null);
      return;
    }
    setAlumnoExpandido(idAlumno);
    if (inscripciones[idAlumno]) return;

    setCargandoInscripciones(prev => ({ ...prev, [idAlumno]: true }));
    try {
      const res = await apiFetch(`/inscripciones/alumno/${idAlumno}`);
      const data = await res.json();
      setInscripciones(prev => ({ ...prev, [idAlumno]: data }));
    } catch (error) {
      toast.error('Error al cargar inscripciones');
    } finally {
      setCargandoInscripciones(prev => ({ ...prev, [idAlumno]: false }));
    }
  };

  const recargarInscripcionesAlumno = async (idAlumno: string) => {
    try {
      const res = await apiFetch(`/inscripciones/alumno/${idAlumno}`);
      if (!res.ok) throw new Error('Error al recargar inscripciones');
      const data = await res.json();
      setInscripciones(prev => ({ ...prev, [idAlumno]: data }));
    } catch (error) {
      toast.error('Error al recargar inscripciones');
      console.error(error);
    }
  };

  const handleGuardarDatosAlumno = async (idAlumno: string) => {
    const draft = alumnoDraft[idAlumno] || {};
    if (!draft.nombreAlumno && !draft.telefono && !draft.tutor) {
      toast.info('No hay cambios para guardar');
      return;
    }
    try {
      setGuardandoAlumno((prev) => ({ ...prev, [idAlumno]: true }));
      await actualizarAlumno(idAlumno, {
        nombreAlumno: draft.nombreAlumno,
        telefono: draft.telefono,
        tutor: draft.tutor,
      });
      toast.success('✅ Datos del alumno actualizados');
      setAlumnoDraft((prev) => ({ ...prev, [idAlumno]: {} }));
      await cargarAlumnos();
      if (alumnoExpandido === idAlumno) {
        const res = await apiFetch(`/inscripciones/alumno/${idAlumno}`);
        const data = await res.json();
        setInscripciones(prev => ({ ...prev, [idAlumno]: data }));
      }
    } catch (e: any) {
      toast.error(e.message || 'Error al actualizar alumno');
    } finally {
      setGuardandoAlumno((prev) => ({ ...prev, [idAlumno]: false }));
    }
  };

  const handleDraftChange = (idAlumno: string, field: keyof Alumno, value: string) => {
    setAlumnoDraft((prev) => ({
      ...prev,
      [idAlumno]: {
        ...(prev[idAlumno] || {}),
        [field]: value,
      },
    }));
  };

  const desactivarAlumno = async (idAlumno: string) => {
    if (!confirm('¿Estás seguro de desactivar este alumno? Se darán de baja todas sus inscripciones activas.')) return;
    try {
      const res = await apiFetch(`/alumnos/${idAlumno}/desactivar`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivo: 'Desactivado manualmente' })
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Error al desactivar');
      }
      toast.success('Alumno desactivado correctamente');
      cargarAlumnos();
      setAlumnoExpandido(null);
      setInscripciones(prev => {
        const newState = { ...prev };
        delete newState[idAlumno];
        return newState;
      });
    } catch (error: any) {
      toast.error(error.message || 'Error al desactivar');
    }
  };

  const reactivarAlumno = async (idAlumno: string) => {
    if (!confirm('¿Reactivar este alumno? Sus inscripciones anteriores permanecerán como baja; deberá reinscribirlo manualmente si desea que continúe.')) return;
    try {
      const res = await apiFetch(`/alumnos/${idAlumno}/reactivar`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Error al reactivar');
      }
      toast.success('Alumno reactivado correctamente');
      cargarAlumnos();
      setAlumnoExpandido(null);
    } catch (error: any) {
      toast.error(error.message || 'Error al reactivar');
    }
  };

  const abrirModalMover = async (inscripcion: Inscripcion, alumno: Alumno) => {
    setInscripcionSeleccionada(inscripcion);
    setAlumnoActual(alumno);
    try {
      const res = await apiFetch('/grupos/con-ocupacion');
      if (!res.ok) throw new Error('Error al cargar grupos');
      const data = await res.json();
      const gruposFiltrados = data.filter((g: Grupo) => g.IdGrupo !== inscripcion.grupoId);
      setGruposDisponibles(gruposFiltrados);
    } catch (error) {
      toast.error('Error al cargar grupos');
    }
    setNuevoGrupoId('');
    setMostrarModalMover(true);
  };

  const handleMoverAlumno = async () => {
    if (!inscripcionSeleccionada || !nuevoGrupoId || !alumnoActual) {
      toast.error('Selecciona un grupo destino');
      return;
    }
    try {
      const res = await apiFetch(`/inscripciones/${alumnoActual.idAlumno}/mover`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nuevoGrupoId,
          grupoActualId: inscripcionSeleccionada.grupoId,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Error al mover');
      }
      const data = await res.json();
      if (data.fusionado) {
        toast.info('♻️ Inscripción duplicada fusionada automáticamente');
      } else {
        toast.success('✅ Alumno movido correctamente');
      }
      setMostrarModalMover(false);
      const resIns = await apiFetch(`/inscripciones/alumno/${alumnoActual.idAlumno}`);
      const dataIns = await resIns.json();
      setInscripciones(prev => ({ ...prev, [alumnoActual.idAlumno]: dataIns }));
      cargarAlumnos();
    } catch (error: any) {
      toast.error(error.message || 'Error al mover');
    }
  };

  const obtenerInfoGrupo = (grupoId: string) => {
    return todosLosGrupos.find(g => g.IdGrupo === grupoId);
  };

  const abrirInscripcionNueva = () => {
    setAlumnoParaInscripcion(null);
    setShowInscripcionForm(true);
  };

  const abrirInscripcionParaAlumno = (alumno: Alumno) => {
    setAlumnoParaInscripcion({
      idAlumno: alumno.idAlumno,
      nombreAlumno: alumno.nombreAlumno,
      telefono: alumno.telefono,
      email: alumno.email,
      tutor: alumno.tutor,
    });
    setShowInscripcionForm(true);
  };

  // ✅ Finalizar curso de un alumno
  const finalizarCurso = async (idAlumno: string, grupoId: string) => {
    if (!confirm('¿Finalizar este curso? El alumno ya no podrá asistir a clases de este grupo.')) return;
    try {
      const res = await apiFetch(`/inscripciones/${idAlumno}/${grupoId}/finalizar`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fechaFin: new Date().toISOString() }),
      });
      if (!res.ok) throw new Error('Error al finalizar');
      toast.success('✅ Curso finalizado correctamente');
      cargarAlumnos();
      if (alumnoExpandido === idAlumno) {
        recargarInscripcionesAlumno(idAlumno);
      }
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  // ----------------------------- ORDENAMIENTO -----------------------------
  const requestSort = (key: keyof Alumno) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: keyof Alumno) => {
    if (!sortConfig || sortConfig.key !== key) return '⇅';
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  // ----------------------------- FILTRADO Y ORDEN -----------------------------
  const alumnosFiltrados = alumnos
    .filter(a => {
      if (filtroEstatus === 'Activo') return a.estatus === 'Activo';
      if (filtroEstatus === 'Inactivo') return a.estatus === 'Inactivo';
      return true;
    })
    .filter(a => a.nombreAlumno.toLowerCase().includes(busqueda.toLowerCase()));

  const alumnosOrdenados = useMemo(() => {
    if (!sortConfig) return alumnosFiltrados;
    const sorted = [...alumnosFiltrados];
    sorted.sort((a, b) => {
      const aVal = a[sortConfig.key] ?? '';
      const bVal = b[sortConfig.key] ?? '';
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [alumnosFiltrados, sortConfig]);

  // ----------------------------- RENDER -----------------------------
  if (cargando) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-[#F8B50E] mx-auto mb-4"></div>
          <p className="text-lg font-bold">🚀 Cargando alumnos...</p>
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
        {/* Contenedor principal alineado con header */}
        <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 md:px-8 h-full flex flex-col py-1 mt-[30px]">
          {/* Cabecera */}
          <div className="flex flex-col md:flex-row items-center justify-between mb-3 gap-2 flex-shrink-0">
            <h1 className="text-lg md:text-xl font-extrabold text-white drop-shadow-lg flex items-center gap-2">
              <span className="bg-gradient-to-r from-[#F8B50E] to-[#67A934] p-1.5 rounded-full shadow-lg text-sm inline-flex items-center justify-center w-8 h-8">
                👨‍🚀
              </span>
              <span className="bg-gradient-to-r from-[#F8B50E] via-[#26AAA3] to-[#67A934] text-transparent bg-clip-text">
                Gestión de Alumnos
              </span>
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <input
                  type="text"
                  placeholder="🔍 Buscar..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="border-2 border-white/30 rounded-full px-4 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F8B50E] focus:border-transparent bg-white/80 backdrop-blur-sm w-32 sm:w-44 transition-all"
                />
              </div>
              <select
                value={filtroEstatus}
                onChange={(e) => setFiltroEstatus(e.target.value as any)}
                className="border-2 border-white/30 rounded-full px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F8B50E] focus:border-transparent bg-white/80 backdrop-blur-sm cursor-pointer"
              >
                <option value="Activo">🟢 Activos</option>
                <option value="Inactivo">🔴 Inactivos</option>
                <option value="Todos">👥 Todos</option>
              </select>
              <button
                onClick={abrirInscripcionNueva}
                className="px-4 py-1.5 bg-gradient-to-r from-[#F8B50E] to-[#FFD700] text-gray-900 rounded-full text-sm font-bold hover:scale-105 transition-all shadow-lg hover:shadow-xl flex items-center gap-1.5"
              >
                <span>🚀</span> Inscribir
              </button>
            </div>
          </div>

          {/* Tabla */}
          <div className="bg-white/60 backdrop-blur-md rounded-2xl shadow-2xl overflow-hidden border border-white/20 flex-1 flex flex-col min-h-0 h-[60vh]">
            <div className="overflow-x-auto overflow-y-auto flex-1">
              <table className="w-full table-auto divide-y divide-gray-200 text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-gradient-to-r from-[#26AAA3] to-[#67A934] text-white">
                    <th className="px-3 py-2 text-left text-sm font-bold uppercase tracking-wider cursor-pointer hover:bg-white/10 transition-colors whitespace-nowrap">
                      <div className="flex items-center gap-1" onClick={() => requestSort('idAlumno')}>
                        ID <span className="opacity-70">{getSortIcon('idAlumno')}</span>
                      </div>
                    </th>
                    <th className="px-3 py-2 text-left text-sm font-bold uppercase tracking-wider cursor-pointer hover:bg-white/10 transition-colors whitespace-nowrap min-w-[100px]">
                      <div className="flex items-center gap-1" onClick={() => requestSort('nombreAlumno')}>
                        Nombre <span className="opacity-70">{getSortIcon('nombreAlumno')}</span>
                      </div>
                    </th>
                    <th className="px-3 py-2 text-left text-sm font-bold uppercase tracking-wider cursor-pointer hover:bg-white/10 transition-colors whitespace-nowrap">
                      <div className="flex items-center gap-1" onClick={() => requestSort('telefono')}>
                        Teléfono <span className="opacity-70">{getSortIcon('telefono')}</span>
                      </div>
                    </th>
                    <th className="px-3 py-2 text-left text-sm font-bold uppercase tracking-wider cursor-pointer hover:bg-white/10 transition-colors whitespace-nowrap">
                      <div className="flex items-center gap-1" onClick={() => requestSort('estatus')}>
                        Estatus <span className="opacity-70">{getSortIcon('estatus')}</span>
                      </div>
                    </th>
                    <th className="px-3 py-2 text-left text-sm font-bold uppercase tracking-wider cursor-pointer hover:bg-white/10 transition-colors whitespace-nowrap">
                      <div className="flex items-center gap-1" onClick={() => requestSort('cursosActivos')}>
                        Cursos <span className="opacity-70">{getSortIcon('cursosActivos')}</span>
                      </div>
                    </th>
                    <th className="px-3 py-2 text-right text-sm font-bold uppercase tracking-wider whitespace-nowrap">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white/50 divide-y divide-gray-200">
                  {alumnosOrdenados.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-500 italic">
                        🧐 No hay alumnos que coincidan con tu búsqueda
                      </td>
                    </tr>
                  ) : (
                    alumnosOrdenados.map((alumno, index) => {
                      const inscripcionesAlumno = inscripciones[alumno.idAlumno] || [];
                      const activas = inscripcionesAlumno.filter(i => i.estatus === 'Activa');
                      const cursosActivos = alumno.cursosActivos ?? activas.length;
                      const draft = alumnoDraft[alumno.idAlumno] || {};
                      const estaGuardando = guardandoAlumno[alumno.idAlumno] || false;

                      return (
                        <React.Fragment key={alumno.idAlumno}>
                          <tr className={`hover:bg-white/60 transition-all duration-200 hover:shadow-md hover:scale-[1.002] ${index % 2 === 0 ? 'bg-white/30' : 'bg-white/10'}`}>
                            <td className="px-3 py-2 whitespace-nowrap font-mono text-sm text-gray-700">{alumno.idAlumno}</td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              <input
                                type="text"
                                value={draft.nombreAlumno ?? alumno.nombreAlumno}
                                onChange={(e) => handleDraftChange(alumno.idAlumno, 'nombreAlumno', e.target.value)}
                                className="w-full max-w-full bg-transparent border-b-2 border-transparent hover:border-[#26AAA3]/50 focus:border-[#26AAA3] focus:outline-none text-sm font-medium text-gray-900 transition-colors truncate"
                                placeholder="Nombre"
                              />
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              <input
                                type="text"
                                value={draft.telefono ?? alumno.telefono ?? ''}
                                onChange={(e) => handleDraftChange(alumno.idAlumno, 'telefono', e.target.value)}
                                className="w-full max-w-full bg-transparent border-b-2 border-transparent hover:border-[#26AAA3]/50 focus:border-[#26AAA3] focus:outline-none text-sm text-gray-700 transition-colors truncate"
                                placeholder="Teléfono"
                              />
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                alumno.estatus === 'Activo' 
                                  ? 'bg-emerald-100/80 text-emerald-700' 
                                  : 'bg-rose-100/80 text-rose-700'
                              }`}>
                                {alumno.estatus === 'Activo' ? '🟢 Activo' : '🔴 Inactivo'}
                              </span>
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              <button
                                onClick={() => toggleExpandirAlumno(alumno.idAlumno)}
                                className="relative inline-flex items-center justify-center w-8 h-8 bg-[#26AAA3]/20 hover:bg-[#26AAA3]/40 rounded-full transition-all duration-300 group"
                              >
                                <span className="text-sm font-bold text-[#26AAA3] group-hover:scale-110 transition-transform">
                                  {cursosActivos}
                                </span>
                                {cursosActivos > 0 && (
                                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-[#67A934] rounded-full animate-pulse"></span>
                                )}
                              </button>
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => handleGuardarDatosAlumno(alumno.idAlumno)}
                                  disabled={estaGuardando}
                                  className={`p-1.5 rounded-lg text-sm font-bold transition-all ${
                                    estaGuardando 
                                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                                      : 'bg-[#26AAA3]/10 hover:bg-[#26AAA3]/20 text-[#26AAA3] hover:scale-110'
                                  }`}
                                  title="Guardar cambios"
                                >
                                  {estaGuardando ? '⏳' : '💾'}
                                </button>
                                <button
                                  onClick={() => toggleExpandirAlumno(alumno.idAlumno)}
                                  className="p-1.5 rounded-lg hover:bg-gray-100/50 transition-all hover:scale-110"
                                >
                                  {alumnoExpandido === alumno.idAlumno ? '▲' : '▼'}
                                </button>
                                {alumno.estatus === 'Activo' ? (
                                  <button
                                    onClick={() => desactivarAlumno(alumno.idAlumno)}
                                    className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-all hover:scale-110 text-sm font-medium"
                                    title="Desactivar alumno"
                                  >
                                    ⛔
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => reactivarAlumno(alumno.idAlumno)}
                                    className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-all hover:scale-110 text-sm font-medium"
                                    title="Reactivar alumno"
                                  >
                                    🔄
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>

                          {alumnoExpandido === alumno.idAlumno && (
                            <tr>
                              <td colSpan={6} className="px-4 py-3 bg-gradient-to-r from-gray-50/80 to-white/50">
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <h4 className="font-bold text-gray-700 text-sm flex items-center gap-2">
                                      <span className="inline-block w-1 h-4 bg-[#F8B50E] rounded-full"></span>
                                      📚 Inscripciones activas
                                    </h4>
                                    <button
                                      onClick={() => abrirInscripcionParaAlumno(alumno)}
                                      className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-full text-xs font-bold transition-all hover:scale-105 flex items-center gap-1"
                                    >
                                      <span>➕</span> Agregar curso
                                    </button>
                                  </div>
                                  {cargandoInscripciones[alumno.idAlumno] ? (
                                    <div className="flex justify-center py-4">
                                      <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-[#26AAA3]"></div>
                                    </div>
                                  ) : activas.length === 0 ? (
                                    <p className="text-sm text-gray-500 italic py-2">✨ Sin inscripciones activas.</p>
                                  ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                      {activas.map((ins) => {
                                        const grupoInfo = obtenerInfoGrupo(ins.grupoId);
                                        const getModalidadColor = (modalidad: string) => {
                                          const colors = {
                                            'presencial': 'border-l-[#26AAA3]',
                                            'en línea': 'border-l-[#67A934]',
                                            'mixta': 'border-l-[#F8B50E]',
                                          };
                                          return colors[modalidad as keyof typeof colors] || 'border-l-gray-400';
                                        };
                                        const colorBorder = getModalidadColor(ins.modalidad);
                                        return (
                                          <div 
                                            key={ins._id} 
                                            className={`bg-white/90 p-3 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 border-l-4 ${colorBorder}`}
                                          >
                                            <div className="flex justify-between items-start">
                                              <div className="flex-1 space-y-1">
                                                <p className="font-bold text-sm text-gray-900 flex items-center gap-1">
                                                  {grupoInfo ? (
                                                    <>
                                                      {grupoInfo.nombreCurso}
                                                      <span className="text-xs font-normal text-gray-400 ml-1">
                                                        ({ins.grupoId})
                                                      </span>
                                                    </>
                                                  ) : (
                                                    `Grupo: ${ins.grupoId}`
                                                  )}
                                                </p>
                                                {grupoInfo && (
                                                  <>
                                                    <p className="text-xs text-gray-600 flex items-center gap-1">
                                                      <span>📅</span> {grupoInfo.diaClase} {grupoInfo.horaClase}
                                                    </p>
                                                    <p className="text-xs text-gray-600 flex items-center gap-1">
                                                      <span>👨‍🏫</span> {grupoInfo.nombreProfesor}
                                                    </p>
                                                  </>
                                                )}
                                                <div className="flex flex-wrap gap-2 text-xs text-gray-600">
                                                  <span className="flex items-center gap-1">
                                                    <span>🎯</span> {ins.modalidad}
                                                  </span>
                                                  <span className="flex items-center gap-1">
                                                    <span>💰</span> ${ins.montoMensualidad}
                                                  </span>
                                                </div>
                                              </div>
                                              <div className="flex flex-col items-end gap-1 ml-2">
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                                  ins.estatus === 'Activa' 
                                                    ? 'bg-emerald-100/80 text-emerald-700' 
                                                    : ins.estatus === 'Finalizada'
                                                    ? 'bg-gray-500/30 text-gray-300 border border-gray-500/30'
                                                    : 'bg-gray-100/80 text-gray-600'
                                                }`}>
                                                  {ins.estatus === 'Activa' ? '✅ Activa' : ins.estatus === 'Finalizada' ? '✅ Finalizado' : '⏸️ Inactiva'}
                                                </span>
                                                {ins.estatus === 'Activa' && (
                                                  <>
                                                    <button
                                                      onClick={() => abrirModalMover(ins, alumno)}
                                                      className="text-blue-600 hover:text-blue-800 text-[10px] font-medium hover:underline transition-all"
                                                    >
                                                      🔄 Mover
                                                    </button>
                                                    <button
                                                      onClick={() => finalizarCurso(alumno.idAlumno, ins.grupoId)}
                                                      className="text-amber-600 hover:text-amber-800 text-[10px] font-medium hover:underline transition-all"
                                                    >
                                                      🏁 Finalizar
                                                    </button>
                                                  </>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
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

          {/* Modal Mover */}
          {mostrarModalMover && inscripcionSeleccionada && alumnoActual && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-3xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border-4 border-[#F8B50E] animate-in zoom-in-95 duration-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#26AAA3] to-[#67A934] rounded-full flex items-center justify-center text-2xl">
                    🚀
                  </div>
                  <h3 className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#26AAA3] to-[#67A934]">
                    Mover alumno
                  </h3>
                </div>
                <p className="text-sm text-gray-700 mb-4 font-medium">
                  <span className="text-[#26AAA3]">{alumnoActual.nombreAlumno}</span> 
                  <span className="text-gray-400 ml-2">→</span>
                  <span className="text-gray-600 ml-2">{inscripcionSeleccionada.grupoId}</span>
                </p>
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">🎯 Grupo destino</label>
                  <select
                    value={nuevoGrupoId}
                    onChange={(e) => setNuevoGrupoId(e.target.value)}
                    className="w-full border-2 border-[#26AAA3]/30 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F8B50E] focus:border-transparent bg-white/90"
                  >
                    <option value="">Selecciona un grupo</option>
                    {gruposDisponibles.map((g) => (
                      <option key={g.IdGrupo} value={g.IdGrupo}>
                        {g.IdGrupo} - {g.nombreCurso} ({g.diaClase} {g.horaClase}) - {g.nombreProfesor} ({g.alumnosInscritos || 0}/{g.CapacidadMaxima || 20})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end gap-3 mt-4 pt-4 border-t-2 border-gray-100">
                  <button
                    onClick={() => setMostrarModalMover(false)}
                    className="px-5 py-2 border-2 border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all hover:scale-105"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleMoverAlumno}
                    disabled={!nuevoGrupoId}
                    className={`px-6 py-2 bg-gradient-to-r from-[#F8B50E] to-[#FFD700] text-gray-900 rounded-xl text-sm font-bold transition-all shadow-lg hover:shadow-xl ${
                      !nuevoGrupoId ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'
                    }`}
                  >
                    Mover ➜
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </BackgroundVideo>

      {/* Modal del formulario de inscripción - MODIFICADO */}
      {showInscripcionForm && (
        <InscripcionForm
          onClose={() => setShowInscripcionForm(false)}
          onSuccess={() => {
            cargarAlumnos();
            if (alumnoParaInscripcion?.idAlumno) {
              recargarInscripcionesAlumno(alumnoParaInscripcion.idAlumno);
            }
            setAlumnoParaInscripcion(null);
          }}
          alumnoInicial={alumnoParaInscripcion || undefined}
        />
      )}
    </>
  );
}