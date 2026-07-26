import React, { useEffect, useState, useMemo } from 'react';
import { apiFetch } from '../../services/api';
import { toast } from 'sonner';
import { useSyncDataReload } from '../../utils/dataSync';
import BackgroundVideo from './BackgroundVideo';

interface Curso {
  idCurso: string;
  nombreCurso: string;
}

interface Profesor {
  idProfesor: string;
  nombre: string;
}

interface AlumnoInscrito {
  idAlumno: string;
  nombreAlumno: string;
  modalidad: string;
  estatus: string;
}

interface Grupo {
  IdGrupo: string;
  idCurso: string;
  nombreCurso: string;
  diaClase: string;
  horaClase: string;
  duracionClase: string;
  idProfesor: string;
  nombreProfesor: string;
  comentario: string;
  CapacidadMaxima: number;
  Estatus: string;
  alumnos?: AlumnoInscrito[];
  alumnosInscritos?: number;
}

export function GruposPage() {
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [profesores, setProfesores] = useState<Profesor[]>([]);
  const [cargando, setCargando] = useState(true);
  const [grupoEditando, setGrupoEditando] = useState<Grupo | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showModalCrear, setShowModalCrear] = useState(false);
  const [nuevoGrupo, setNuevoGrupo] = useState<Partial<Grupo>>({
    nombreCurso: '',
    diaClase: 'Lunes',
    horaClase: '10:00',
    duracionClase: '2 horas',
    CapacidadMaxima: 20,
    Estatus: 'Activo',
  });
  const [grupoExpandido, setGrupoExpandido] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstatus, setFiltroEstatus] = useState<'Activo' | 'Inactivo' | 'Todos'>('Todos');
  const [sortConfig, setSortConfig] = useState<{ key: keyof Grupo; direction: 'asc' | 'desc' } | null>(null);

  const cargarDatos = async () => {
    try {
      setCargando(true);
      const [resGrupos, resCursos, resProfesores] = await Promise.all([
        apiFetch('/grupos/con-ocupacion'),
        apiFetch('/cursos'),
        apiFetch('/profesores'),
      ]);

      if (!resGrupos.ok) throw new Error('Error al cargar grupos');
      if (!resCursos.ok) throw new Error('Error al cargar cursos');
      if (!resProfesores.ok) throw new Error('Error al cargar profesores');

      const gruposData = await resGrupos.json();
      const cursosData = await resCursos.json();
      const profesoresData = await resProfesores.json();

      const gruposConAlumnos = await Promise.all(
        gruposData.map(async (grupo: Grupo) => {
          try {
            const resInscripciones = await apiFetch(`/inscripciones/grupo/${grupo.IdGrupo}`);
            if (!resInscripciones.ok) {
              console.warn(`No se pudieron obtener inscripciones para el grupo ${grupo.IdGrupo}`);
              return { ...grupo, alumnos: [], alumnosInscritos: grupo.alumnosInscritos || 0 };
            }
            const inscripciones = await resInscripciones.json();
            const alumnosActivos = inscripciones.filter((ins: any) => ins.estatus === 'Activa');
            return {
              ...grupo,
              alumnos: alumnosActivos,
              alumnosInscritos: grupo.alumnosInscritos || alumnosActivos.length,
            };
          } catch (error) {
            console.error(`Error al cargar inscripciones para grupo ${grupo.IdGrupo}:`, error);
            return { ...grupo, alumnos: [], alumnosInscritos: grupo.alumnosInscritos || 0 };
          }
        })
      );

      setGrupos(gruposConAlumnos);
      setCursos(cursosData);
      setProfesores(profesoresData);
    } catch (error) {
      toast.error('Error al cargar datos');
      console.error(error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  useSyncDataReload(cargarDatos);

  const handleEditar = (grupo: Grupo) => {
    setGrupoEditando({ ...grupo });
    setShowModal(true);
  };

  const handleGuardar = async () => {
    if (!grupoEditando) return;

    try {
      const payload: any = {
        diaClase: grupoEditando.diaClase,
        horaClase: grupoEditando.horaClase,
        duracionClase: grupoEditando.duracionClase,
        comentario: grupoEditando.comentario,
        CapacidadMaxima: grupoEditando.CapacidadMaxima,
        Estatus: grupoEditando.Estatus,
      };

      if (grupoEditando.idCurso) payload.idCurso = grupoEditando.idCurso;
      if (grupoEditando.idProfesor) payload.idProfesor = grupoEditando.idProfesor;
      if (grupoEditando.nombreCurso) payload.nombreCurso = grupoEditando.nombreCurso;
      if (grupoEditando.nombreProfesor) payload.nombreProfesor = grupoEditando.nombreProfesor;

      const res = await apiFetch(`/grupos/${grupoEditando.IdGrupo}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Error al actualizar grupo');
      }

      toast.success('✅ Grupo actualizado correctamente');
      setShowModal(false);
      cargarDatos();
    } catch (error: any) {
      toast.error(error.message || 'Error al actualizar grupo');
    }
  };

  const handleCrearGrupo = async () => {
    try {
      if (!nuevoGrupo.nombreCurso || !nuevoGrupo.diaClase || !nuevoGrupo.horaClase) {
        toast.error('Faltan campos obligatorios');
        return;
      }

      const payload = {
        idCurso: nuevoGrupo.idCurso || '',
        nombreCurso: nuevoGrupo.nombreCurso,
        diaClase: nuevoGrupo.diaClase,
        horaClase: nuevoGrupo.horaClase,
        duracionClase: nuevoGrupo.duracionClase || '2 horas',
        idProfesor: nuevoGrupo.idProfesor || '',
        nombreProfesor: nuevoGrupo.nombreProfesor || '',
        comentario: nuevoGrupo.comentario || '',
        capacidadMaxima: nuevoGrupo.CapacidadMaxima || 20,
        Estatus: nuevoGrupo.Estatus || 'Activo',
      };

      const res = await apiFetch('/grupos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Error al crear grupo');
      }

      toast.success('🎉 Grupo creado correctamente');
      setShowModalCrear(false);
      setNuevoGrupo({
        nombreCurso: '',
        diaClase: 'Lunes',
        horaClase: '10:00',
        duracionClase: '2 horas',
        CapacidadMaxima: 20,
        Estatus: 'Activo',
      });
      cargarDatos();
    } catch (error: any) {
      toast.error(error.message || 'Error al crear grupo');
    }
  };

  const toggleEstatusGrupo = async (idGrupo: string) => {
    const grupo = grupos.find(g => g.IdGrupo === idGrupo);
    if (!grupo) return;

    if (grupo.Estatus === 'Activo' && grupo.alumnosInscritos && grupo.alumnosInscritos > 0) {
      toast.error('No se puede desactivar un grupo con alumnos activos');
      return;
    }

    const nuevoEstatus = grupo.Estatus === 'Activo' ? 'Inactivo' : 'Activo';
    const confirmMsg = nuevoEstatus === 'Inactivo'
      ? '¿Desactivar este grupo? (Solo si está vacío)'
      : '¿Activar este grupo?';

    if (!confirm(confirmMsg)) return;

    try {
      const res = await apiFetch(`/grupos/${idGrupo}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Estatus: nuevoEstatus })
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Error al cambiar estatus');
      }

      toast.success(`Grupo ${nuevoEstatus.toLowerCase()} correctamente`);
      cargarDatos();
    } catch (error: any) {
      toast.error(error.message || 'Error al cambiar estatus');
    }
  };

  const toggleExpandir = (id: string) => {
    setGrupoExpandido(grupoExpandido === id ? null : id);
  };

  const requestSort = (key: keyof Grupo) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: keyof Grupo) => {
    if (!sortConfig || sortConfig.key !== key) return '⇅';
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  const gruposFiltrados = useMemo(() => {
    let resultado = [...grupos];

    if (filtroEstatus !== 'Todos') {
      resultado = resultado.filter(g => g.Estatus === filtroEstatus);
    }

    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      resultado = resultado.filter(g =>
        g.nombreCurso.toLowerCase().includes(q) ||
        g.nombreProfesor.toLowerCase().includes(q) ||
        g.IdGrupo.toLowerCase().includes(q)
      );
    }

    if (sortConfig) {
      resultado.sort((a, b) => {
        let aVal: any = a[sortConfig.key];
        let bVal: any = b[sortConfig.key];
        if (aVal === undefined || aVal === null) aVal = '';
        if (bVal === undefined || bVal === null) bVal = '';
        if (sortConfig.key === 'CapacidadMaxima' || sortConfig.key === 'alumnosInscritos') {
          aVal = Number(aVal);
          bVal = Number(bVal);
        }
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return resultado;
  }, [grupos, filtroEstatus, busqueda, sortConfig]);

  if (cargando) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-[#F8B50E] mx-auto mb-4"></div>
          <p className="text-lg font-bold">🚀 Cargando grupos...</p>
        </div>
      </div>
    );
  }

  const decorativeVideos: { src: string; position: any }[] = [];

  return (
    <BackgroundVideo
      videoSrc="https://media.gokulab.mx/Galery/videos/gokulabanimado.mp4"
      decorativeVideos={decorativeVideos}
    >
      {/* Contenedor principal - mismo que Alumnos */}
      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 md:px-8 h-full flex flex-col py-1 mt-[30px]">
        {/* Cabecera mejorada - estilo Alumnos */}
        <div className="flex flex-col md:flex-row items-center justify-between mb-3 gap-2 flex-shrink-0">
          <h1 className="text-lg md:text-xl font-extrabold text-white drop-shadow-lg flex items-center gap-2">
            <span className="bg-gradient-to-r from-[#F8B50E] to-[#67A934] p-1.5 rounded-full shadow-lg text-sm inline-flex items-center justify-center w-8 h-8">
              🏫
            </span>
            <span className="bg-gradient-to-r from-[#F8B50E] via-[#26AAA3] to-[#67A934] text-transparent bg-clip-text">
              Gestión de Grupos
            </span>
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <input
                type="text"
                placeholder="🔍 Buscar..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="border-2 border-white/30 rounded-full px-4 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent bg-white/80 backdrop-blur-sm w-32 sm:w-44 transition-all"
              />
            </div>
            <select
              value={filtroEstatus}
              onChange={(e) => setFiltroEstatus(e.target.value as any)}
              className="border-2 border-white/30 rounded-full px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent bg-white/80 backdrop-blur-sm cursor-pointer"
            >
              <option value="Todos">👥 Todos</option>
              <option value="Activo">🟢 Activos</option>
              <option value="Inactivo">🔴 Inactivos</option>
            </select>
            <button
              onClick={() => setShowModalCrear(true)}
              className="px-4 py-1.5 bg-gradient-to-r from-blue-500 to-cyan-400 text-white rounded-full text-sm font-bold hover:scale-105 transition-all shadow-lg hover:shadow-xl flex items-center gap-1.5"
            >
              <span>✨</span> Crear
            </button>
          </div>
        </div>

        {/* Tabla con altura fija y scroll interno */}
        <div className="bg-white/60 backdrop-blur-md rounded-2xl shadow-2xl overflow-hidden border border-white/20 flex-1 flex flex-col min-h-0 h-[60vh]">
          <div className="overflow-x-auto overflow-y-auto flex-1">
            <table className="w-full table-auto divide-y divide-gray-200 text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="bg-gradient-to-r from-blue-500 to-cyan-400 text-white">
                  <th className="px-3 py-2 text-left text-sm font-bold uppercase tracking-wider cursor-pointer hover:bg-white/10 transition-colors whitespace-nowrap">
                    <div className="flex items-center gap-1" onClick={() => requestSort('IdGrupo')}>
                      ID <span className="opacity-70">{getSortIcon('IdGrupo')}</span>
                    </div>
                  </th>
                  <th className="px-3 py-2 text-left text-sm font-bold uppercase tracking-wider cursor-pointer hover:bg-white/10 transition-colors whitespace-nowrap min-w-[130px]">
                    <div className="flex items-center gap-1" onClick={() => requestSort('nombreCurso')}>
                      Curso <span className="opacity-70">{getSortIcon('nombreCurso')}</span>
                    </div>
                  </th>
                  <th className="px-3 py-2 text-left text-sm font-bold uppercase tracking-wider cursor-pointer hover:bg-white/10 transition-colors whitespace-nowrap min-w-[110px]">
                    <div className="flex items-center gap-1" onClick={() => requestSort('nombreProfesor')}>
                      Profesor <span className="opacity-70">{getSortIcon('nombreProfesor')}</span>
                    </div>
                  </th>
                  <th className="px-3 py-2 text-left text-sm font-bold uppercase tracking-wider cursor-pointer hover:bg-white/10 transition-colors whitespace-nowrap">
                    <div className="flex items-center gap-1" onClick={() => requestSort('diaClase')}>
                      Horario <span className="opacity-70">{getSortIcon('diaClase')}</span>
                    </div>
                  </th>
                  <th className="px-3 py-2 text-left text-sm font-bold uppercase tracking-wider cursor-pointer hover:bg-white/10 transition-colors whitespace-nowrap">
                    <div className="flex items-center gap-1" onClick={() => requestSort('alumnosInscritos')}>
                      Alumnos <span className="opacity-70">{getSortIcon('alumnosInscritos')}</span>
                    </div>
                  </th>
                  <th className="px-3 py-2 text-left text-sm font-bold uppercase tracking-wider cursor-pointer hover:bg-white/10 transition-colors whitespace-nowrap">
                    <div className="flex items-center gap-1" onClick={() => requestSort('CapacidadMaxima')}>
                      Cap. <span className="opacity-70">{getSortIcon('CapacidadMaxima')}</span>
                    </div>
                  </th>
                  <th className="px-3 py-2 text-left text-sm font-bold uppercase tracking-wider cursor-pointer hover:bg-white/10 transition-colors whitespace-nowrap">
                    <div className="flex items-center gap-1" onClick={() => requestSort('Estatus')}>
                      Estatus <span className="opacity-70">{getSortIcon('Estatus')}</span>
                    </div>
                  </th>
                  <th className="px-3 py-2 text-right text-sm font-bold uppercase tracking-wider whitespace-nowrap">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white/50 divide-y divide-gray-200">
                {gruposFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-500 italic">
                      🧐 No hay grupos que coincidan con tu búsqueda
                    </td>
                  </tr>
                ) : (
                  gruposFiltrados.map((grupo, index) => (
                    <React.Fragment key={grupo.IdGrupo}>
                      <tr className={`hover:bg-white/60 transition-all duration-200 hover:shadow-md hover:scale-[1.002] ${index % 2 === 0 ? 'bg-white/30' : 'bg-white/10'}`}>
                        <td className="px-3 py-2 whitespace-nowrap font-mono text-sm text-gray-700">{grupo.IdGrupo}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{grupo.nombreCurso}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700">{grupo.nombreProfesor}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700">
                          {grupo.diaClase} {grupo.horaClase}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <button
                            onClick={() => toggleExpandir(grupo.IdGrupo)}
                            className="relative inline-flex items-center justify-center w-8 h-8 bg-blue-500/20 hover:bg-blue-500/40 rounded-full transition-all duration-300 group"
                          >
                            <span className="text-sm font-bold text-blue-600 group-hover:scale-110 transition-transform">
                              {grupo.alumnosInscritos || 0}
                            </span>
                            {(grupo.alumnosInscritos || 0) > 0 && (
                              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse"></span>
                            )}
                          </button>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700">{grupo.CapacidadMaxima}</td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                            grupo.Estatus === 'Activo'
                              ? 'bg-emerald-100/80 text-emerald-700'
                              : 'bg-rose-100/80 text-rose-700'
                          }`}>
                            {grupo.Estatus === 'Activo' ? '🟢 Activo' : '🔴 Inactivo'}
                          </span>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleEditar(grupo)}
                              className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 hover:scale-110 transition-all"
                              title="Editar grupo"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => toggleEstatusGrupo(grupo.IdGrupo)}
                              disabled={grupo.Estatus === 'Activo' && (grupo.alumnosInscritos || 0) > 0}
                              className={`p-1.5 rounded-lg transition-all hover:scale-110 text-sm font-medium ${
                                grupo.Estatus === 'Activo'
                                  ? 'text-rose-600 hover:bg-rose-50'
                                  : 'text-emerald-600 hover:bg-emerald-50'
                              } ${
                                grupo.Estatus === 'Activo' && (grupo.alumnosInscritos || 0) > 0
                                  ? 'opacity-50 cursor-not-allowed'
                                  : ''
                              }`}
                              title={grupo.Estatus === 'Activo' ? 'Desactivar grupo' : 'Activar grupo'}
                            >
                              {grupo.Estatus === 'Activo' ? '⛔' : '🔄'}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {grupoExpandido === grupo.IdGrupo && (
                        <tr>
                          <td colSpan={8} className="px-4 py-3 bg-gradient-to-r from-gray-50/80 to-white/50">
                            <div className="space-y-2">
                              <h4 className="font-bold text-gray-700 text-sm flex items-center gap-2">
                                <span className="inline-block w-1 h-4 bg-blue-400 rounded-full"></span>
                                📚 Alumnos inscritos
                              </h4>
                              {grupo.alumnos && grupo.alumnos.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-1.5">
                                  {grupo.alumnos.map((alumno) => (
                                    <div key={alumno.idAlumno} className="flex items-center justify-between bg-white/90 p-2 rounded-lg border border-gray-200 text-sm shadow-sm hover:shadow-md transition-all">
                                      <span className="font-medium text-gray-900">{alumno.nombreAlumno}</span>
                                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                        alumno.modalidad === 'Virtual'
                                          ? 'bg-blue-100/80 text-blue-700'
                                          : 'bg-cyan-100/80 text-cyan-700'
                                      }`}>
                                        {alumno.modalidad}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-gray-500 italic py-2">✨ No hay alumnos inscritos en este grupo.</p>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Editar - con colores azules */}
        {showModal && grupoEditando && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border-4 border-blue-300 animate-in zoom-in-95 duration-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-full flex items-center justify-center text-2xl">
                  ✏️
                </div>
                <h2 className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-600">
                  Editar Grupo
                </h2>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">ID del grupo</label>
                  <input type="text" value={grupoEditando.IdGrupo} disabled className="w-full border-2 border-gray-200 bg-gray-100 rounded-xl px-4 py-3 text-sm text-gray-500 cursor-not-allowed" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Curso</label>
                  <select
                    value={grupoEditando.idCurso}
                    onChange={(e) => {
                      const curso = cursos.find(c => c.idCurso === e.target.value);
                      setGrupoEditando({
                        ...grupoEditando,
                        idCurso: e.target.value,
                        nombreCurso: curso ? curso.nombreCurso : grupoEditando.nombreCurso,
                      });
                    }}
                    className="w-full border-2 border-blue-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white/90"
                  >
                    <option value="">Seleccionar curso</option>
                    {cursos.map((c) => (
                      <option key={c.idCurso} value={c.idCurso}>{c.nombreCurso}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre del curso (manual)</label>
                  <input
                    type="text"
                    value={grupoEditando.nombreCurso}
                    onChange={(e) => setGrupoEditando({ ...grupoEditando, nombreCurso: e.target.value })}
                    className="w-full border-2 border-blue-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white/90"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Profesor</label>
                  <select
                    value={grupoEditando.idProfesor}
                    onChange={(e) => {
                      const prof = profesores.find(p => p.idProfesor === e.target.value);
                      setGrupoEditando({
                        ...grupoEditando,
                        idProfesor: e.target.value,
                        nombreProfesor: prof ? prof.nombre : grupoEditando.nombreProfesor,
                      });
                    }}
                    className="w-full border-2 border-blue-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white/90"
                  >
                    <option value="">Seleccionar profesor</option>
                    {profesores.map((p) => (
                      <option key={p.idProfesor} value={p.idProfesor}>{p.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre del profesor (manual)</label>
                  <input
                    type="text"
                    value={grupoEditando.nombreProfesor}
                    onChange={(e) => setGrupoEditando({ ...grupoEditando, nombreProfesor: e.target.value })}
                    className="w-full border-2 border-blue-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white/90"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Día</label>
                  <select
                    value={grupoEditando.diaClase}
                    onChange={(e) => setGrupoEditando({ ...grupoEditando, diaClase: e.target.value })}
                    className="w-full border-2 border-blue-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white/90"
                  >
                    {['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'].map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Hora</label>
                  <input
                    type="time"
                    value={grupoEditando.horaClase}
                    onChange={(e) => setGrupoEditando({ ...grupoEditando, horaClase: e.target.value })}
                    className="w-full border-2 border-blue-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white/90"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Duración</label>
                  <select
                    value={grupoEditando.duracionClase}
                    onChange={(e) => setGrupoEditando({ ...grupoEditando, duracionClase: e.target.value })}
                    className="w-full border-2 border-blue-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white/90"
                  >
                    {['1 hora','1:30 hr','2 horas','2:30 hr','3 horas'].map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Capacidad</label>
                  <input
                    type="number"
                    value={grupoEditando.CapacidadMaxima}
                    onChange={(e) => setGrupoEditando({ ...grupoEditando, CapacidadMaxima: parseInt(e.target.value) || 1 })}
                    className="w-full border-2 border-blue-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white/90"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Comentario</label>
                  <input
                    type="text"
                    value={grupoEditando.comentario}
                    onChange={(e) => setGrupoEditando({ ...grupoEditando, comentario: e.target.value })}
                    className="w-full border-2 border-blue-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white/90"
                    placeholder="Notas internas"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Estatus</label>
                  <select
                    value={grupoEditando.Estatus}
                    onChange={(e) => setGrupoEditando({ ...grupoEditando, Estatus: e.target.value })}
                    className="w-full border-2 border-blue-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white/90"
                  >
                    <option value="Activo">Activo</option>
                    <option value="Inactivo">Inactivo</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t-2 border-gray-100">
                <button onClick={() => setShowModal(false)} className="px-5 py-2 border-2 border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all hover:scale-105">Cancelar</button>
                <button onClick={handleGuardar} className="px-6 py-2 bg-gradient-to-r from-blue-500 to-cyan-400 text-white rounded-xl text-sm font-bold hover:scale-105 transition-all shadow-lg hover:shadow-xl">Guardar</button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Crear - con colores azules */}
        {showModalCrear && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border-4 border-blue-300 animate-in zoom-in-95 duration-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-full flex items-center justify-center text-2xl">
                  🚀
                </div>
                <h2 className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-600">
                  Crear nuevo grupo
                </h2>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Curso</label>
                  <select
                    value={nuevoGrupo.idCurso || ''}
                    onChange={(e) => {
                      const curso = cursos.find(c => c.idCurso === e.target.value);
                      setNuevoGrupo({
                        ...nuevoGrupo,
                        idCurso: e.target.value,
                        nombreCurso: curso ? curso.nombreCurso : nuevoGrupo.nombreCurso,
                      });
                    }}
                    className="w-full border-2 border-blue-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white/90"
                  >
                    <option value="">Seleccionar curso</option>
                    {cursos.map((c) => (
                      <option key={c.idCurso} value={c.idCurso}>{c.nombreCurso}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre del curso</label>
                  <input
                    type="text"
                    value={nuevoGrupo.nombreCurso || ''}
                    onChange={(e) => setNuevoGrupo({ ...nuevoGrupo, nombreCurso: e.target.value })}
                    className="w-full border-2 border-blue-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white/90"
                    placeholder="Nombre del curso"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Profesor</label>
                  <select
                    value={nuevoGrupo.idProfesor || ''}
                    onChange={(e) => {
                      const prof = profesores.find(p => p.idProfesor === e.target.value);
                      setNuevoGrupo({
                        ...nuevoGrupo,
                        idProfesor: e.target.value,
                        nombreProfesor: prof ? prof.nombre : nuevoGrupo.nombreProfesor,
                      });
                    }}
                    className="w-full border-2 border-blue-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white/90"
                  >
                    <option value="">Seleccionar profesor</option>
                    {profesores.map((p) => (
                      <option key={p.idProfesor} value={p.idProfesor}>{p.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre del profesor</label>
                  <input
                    type="text"
                    value={nuevoGrupo.nombreProfesor || ''}
                    onChange={(e) => setNuevoGrupo({ ...nuevoGrupo, nombreProfesor: e.target.value })}
                    className="w-full border-2 border-blue-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white/90"
                    placeholder="Nombre del profesor"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Día</label>
                  <select
                    value={nuevoGrupo.diaClase || 'Lunes'}
                    onChange={(e) => setNuevoGrupo({ ...nuevoGrupo, diaClase: e.target.value })}
                    className="w-full border-2 border-blue-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white/90"
                  >
                    {['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'].map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Hora</label>
                  <input
                    type="time"
                    value={nuevoGrupo.horaClase || '10:00'}
                    onChange={(e) => setNuevoGrupo({ ...nuevoGrupo, horaClase: e.target.value })}
                    className="w-full border-2 border-blue-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white/90"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Duración</label>
                  <select
                    value={nuevoGrupo.duracionClase || '2 horas'}
                    onChange={(e) => setNuevoGrupo({ ...nuevoGrupo, duracionClase: e.target.value })}
                    className="w-full border-2 border-blue-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white/90"
                  >
                    {['1 hora','1:30 hr','2 horas','2:30 hr','3 horas'].map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Capacidad</label>
                  <input
                    type="number"
                    value={nuevoGrupo.CapacidadMaxima || 20}
                    onChange={(e) => setNuevoGrupo({ ...nuevoGrupo, CapacidadMaxima: parseInt(e.target.value) || 1 })}
                    className="w-full border-2 border-blue-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white/90"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Comentario</label>
                  <input
                    type="text"
                    value={nuevoGrupo.comentario || ''}
                    onChange={(e) => setNuevoGrupo({ ...nuevoGrupo, comentario: e.target.value })}
                    className="w-full border-2 border-blue-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white/90"
                    placeholder="Notas internas"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Estatus</label>
                  <select
                    value={nuevoGrupo.Estatus || 'Activo'}
                    onChange={(e) => setNuevoGrupo({ ...nuevoGrupo, Estatus: e.target.value })}
                    className="w-full border-2 border-blue-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white/90"
                  >
                    <option value="Activo">Activo</option>
                    <option value="Inactivo">Inactivo</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t-2 border-gray-100">
                <button onClick={() => setShowModalCrear(false)} className="px-5 py-2 border-2 border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all hover:scale-105">Cancelar</button>
                <button onClick={handleCrearGrupo} className="px-6 py-2 bg-gradient-to-r from-blue-500 to-cyan-400 text-white rounded-xl text-sm font-bold hover:scale-105 transition-all shadow-lg hover:shadow-xl">Crear grupo</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </BackgroundVideo>
  );
}