import React, { useEffect, useState, useMemo } from 'react';
import { apiFetch } from '../../services/api';
import { toast } from 'sonner';
import { useSyncDataReload } from '../../utils/dataSync';
import { 
  Users, BookOpen, User, Activity, Search, Filter, 
  ChevronDown, ChevronUp, Edit2, Plus, Power, ShieldAlert, CheckCircle2
} from 'lucide-react';

// ============================================================
// TIPOS
// ============================================================

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

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

export function GruposPage() {
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [profesores, setProfesores] = useState<Profesor[]>([]);
  const [cargando, setCargando] = useState(true);
  
  // Modales
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

  // Filtros y Tabla
  const [grupoExpandido, setGrupoExpandido] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstatus, setFiltroEstatus] = useState<'Activo' | 'Inactivo' | 'Todos'>('Todos');
  const [sortConfig, setSortConfig] = useState<{ key: keyof Grupo; direction: 'asc' | 'desc' } | null>(null);

  // ============================================================
  // CARGA DE DATOS
  // ============================================================

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

  // ============================================================
  // ACCIONES (GUARDAR, CREAR, ESTATUS)
  // ============================================================

  const handleEditar = (e: React.MouseEvent, grupo: Grupo) => {
    e.stopPropagation();
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

  const toggleEstatusGrupo = async (e: React.MouseEvent, grupo: Grupo) => {
    e.stopPropagation();
    
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
      const res = await apiFetch(`/grupos/${grupo.IdGrupo}`, {
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

  // ============================================================
  // FILTRADO Y KPIs
  // ============================================================

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

  // Cálculos para los KPIs superiores
  const kpis = useMemo(() => {
    const activos = grupos.filter(g => g.Estatus === 'Activo').length;
    const totalAlumnos = grupos.reduce((sum, g) => sum + (g.alumnosInscritos || 0), 0);
    const totalCapacidad = grupos.reduce((sum, g) => sum + (g.CapacidadMaxima || 0), 0);
    const ocupacion = totalCapacidad > 0 ? (totalAlumnos / totalCapacidad) * 100 : 0;

    return { activos, totalAlumnos, ocupacion };
  }, [grupos]);

  if (cargando) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-[#26AAA3] mx-auto mb-4"></div>
          <p className="text-lg font-bold text-gray-600">Cargando grupos...</p>
        </div>
      </div>
    );
  }

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-[#26AAA3]" />
            Gestión de Grupos
          </h1>
          <p className="text-gray-500 text-sm mt-1">Administra horarios, capacidad y alumnos por grupo</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowModalCrear(true)}
            className="px-5 py-2.5 bg-[#1E293B] text-white rounded-lg font-medium hover:bg-gray-800 transition-colors shadow-sm flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            Crear Grupo
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard titulo="Total Grupos" valor={grupos.length.toString()} icon={<BookOpen className="w-5 h-5" />} color="text-blue-600" bg="bg-blue-50" />
        <KpiCard titulo="Grupos Activos" valor={kpis.activos.toString()} icon={<Activity className="w-5 h-5" />} color="text-emerald-600" bg="bg-emerald-50" />
        <KpiCard titulo="Alumnos Inscritos" valor={kpis.totalAlumnos.toString()} icon={<Users className="w-5 h-5" />} color="text-purple-600" bg="bg-purple-50" />
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96 flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Buscar por curso, profesor o ID..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#26AAA3] focus:border-transparent"
          />
        </div>

        <div className="flex bg-gray-100 p-1 rounded-lg w-full md:w-auto">
          <button onClick={() => setFiltroEstatus('Todos')} className={`flex-1 md:flex-none px-4 py-1.5 text-xs font-bold rounded-md transition-all ${filtroEstatus === 'Todos' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Todos</button>
          <button onClick={() => setFiltroEstatus('Activo')} className={`flex-1 md:flex-none px-4 py-1.5 text-xs font-bold rounded-md transition-all ${filtroEstatus === 'Activo' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Activos</button>
          <button onClick={() => setFiltroEstatus('Inactivo')} className={`flex-1 md:flex-none px-4 py-1.5 text-xs font-bold rounded-md transition-all ${filtroEstatus === 'Inactivo' ? 'bg-white text-rose-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Inactivos</button>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500 font-bold">
              <tr>
                <th className="px-4 py-4 w-12 text-center"></th>
                <th className="px-4 py-4 cursor-pointer hover:bg-gray-100" onClick={() => requestSort('IdGrupo')}>ID</th>
                <th className="px-4 py-4 cursor-pointer hover:bg-gray-100" onClick={() => requestSort('nombreCurso')}>Curso</th>
                <th className="px-4 py-4 cursor-pointer hover:bg-gray-100" onClick={() => requestSort('nombreProfesor')}>Profesor</th>
                <th className="px-4 py-4 cursor-pointer hover:bg-gray-100" onClick={() => requestSort('diaClase')}>Horario</th>
                <th className="px-4 py-4 text-center">Ocupación</th>
                <th className="px-4 py-4 text-center">Estatus</th>
                <th className="px-4 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {gruposFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                    <Filter className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                    <p>No hay grupos que coincidan con tu búsqueda.</p>
                  </td>
                </tr>
              ) : (
                gruposFiltrados.map((grupo) => {
                  const isExpanded = grupoExpandido === grupo.IdGrupo;
                  const ocupacionPct = grupo.CapacidadMaxima > 0 
                    ? ((grupo.alumnosInscritos || 0) / grupo.CapacidadMaxima) * 100 
                    : 0;
                  
                  let ocupacionColor = 'bg-emerald-500';
                  if (ocupacionPct >= 100) ocupacionColor = 'bg-rose-500';
                  else if (ocupacionPct >= 80) ocupacionColor = 'bg-amber-500';

                  return (
                    <React.Fragment key={grupo.IdGrupo}>
                      {/* Fila Principal */}
                      <tr 
                        onClick={() => toggleExpandir(grupo.IdGrupo)}
                        className={`cursor-pointer transition-colors ${isExpanded ? 'bg-[#26AAA3]/5' : 'hover:bg-gray-50'}`}
                      >
                        <td className="px-4 py-4 text-center text-gray-400">
                          {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                        </td>
                        <td className="px-4 py-4 font-mono text-xs text-gray-500">{grupo.IdGrupo}</td>
                        <td className="px-4 py-4 font-bold text-gray-900">{grupo.nombreCurso}</td>
                        <td className="px-4 py-4 text-gray-600">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                              <User className="h-3 w-3" />
                            </div>
                            {grupo.nombreProfesor || 'Sin asignar'}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-gray-600 whitespace-nowrap">
                          {grupo.diaClase} · {grupo.horaClase}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-xs font-bold text-gray-700">{grupo.alumnosInscritos || 0} / {grupo.CapacidadMaxima}</span>
                            <div className="w-full max-w-[80px] h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${ocupacionColor}`} style={{ width: `${Math.min(ocupacionPct, 100)}%` }}></div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            grupo.Estatus === 'Activo' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                          }`}>
                            {grupo.Estatus === 'Activo' ? <CheckCircle2 className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
                            {grupo.Estatus}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={(e) => handleEditar(e, grupo)}
                              className="p-1.5 text-gray-400 hover:text-[#26AAA3] hover:bg-[#26AAA3]/10 rounded transition-colors"
                              title="Editar"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={(e) => toggleEstatusGrupo(e, grupo)}
                              disabled={grupo.Estatus === 'Activo' && (grupo.alumnosInscritos || 0) > 0}
                              className={`p-1.5 rounded transition-colors ${
                                grupo.Estatus === 'Activo' 
                                  ? 'text-gray-400 hover:text-rose-600 hover:bg-rose-50' 
                                  : 'text-gray-400 hover:text-emerald-600 hover:bg-emerald-50'
                              } disabled:opacity-30 disabled:cursor-not-allowed`}
                              title={grupo.Estatus === 'Activo' ? 'Desactivar' : 'Activar'}
                            >
                              <Power className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Fila Expandida (Alumnos) */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={8} className="p-0 border-b border-gray-200 bg-gray-50/50">
                            <div className="p-4 pl-16">
                              <h4 className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-2">
                                <Users className="h-4 w-4" /> Alumnos Inscritos
                              </h4>
                              {grupo.alumnos && grupo.alumnos.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                                  {grupo.alumnos.map((alumno) => (
                                    <div key={alumno.idAlumno} className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm flex flex-col justify-between">
                                      <div className="flex justify-between items-start mb-1">
                                        <span className="font-bold text-gray-800 text-sm truncate">{alumno.nombreAlumno}</span>
                                      </div>
                                      <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-50">
                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                                          alumno.modalidad === 'Virtual' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                                        }`}>
                                          {alumno.modalidad}
                                        </span>
                                        <span className="text-xs text-gray-500 font-medium">{alumno.idAlumno}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="bg-white border border-gray-100 rounded-lg p-6 text-center text-sm text-gray-500">
                                  No hay alumnos inscritos en este grupo actualmente.
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

      {/* ============================================================ */}
      {/* MODAL CREAR */}
      {/* ============================================================ */}
      {showModalCrear && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50 rounded-t-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#1E293B] rounded-lg flex items-center justify-center text-white shadow-sm">
                  <Plus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Crear Nuevo Grupo</h3>
                  <p className="text-sm text-gray-500">Configura el horario y la capacidad</p>
                </div>
              </div>
            </div>
            
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Curso (Catálogo)</label>
                  <select
                    value={nuevoGrupo.idCurso || ''}
                    onChange={(e) => {
                      const curso = cursos.find(c => c.idCurso === e.target.value);
                      setNuevoGrupo({ ...nuevoGrupo, idCurso: e.target.value, nombreCurso: curso ? curso.nombreCurso : nuevoGrupo.nombreCurso });
                    }}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#26AAA3] focus:border-transparent bg-white"
                  >
                    <option value="">Seleccionar curso</option>
                    {cursos.map((c) => <option key={c.idCurso} value={c.idCurso}>{c.nombreCurso}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre del Curso (Manual)</label>
                  <input
                    type="text"
                    value={nuevoGrupo.nombreCurso || ''}
                    onChange={(e) => setNuevoGrupo({ ...nuevoGrupo, nombreCurso: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#26AAA3] focus:border-transparent"
                    placeholder="Ej. Robótica Básica"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Profesor (Catálogo)</label>
                  <select
                    value={nuevoGrupo.idProfesor || ''}
                    onChange={(e) => {
                      const prof = profesores.find(p => p.idProfesor === e.target.value);
                      setNuevoGrupo({ ...nuevoGrupo, idProfesor: e.target.value, nombreProfesor: prof ? prof.nombre : nuevoGrupo.nombreProfesor });
                    }}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#26AAA3] focus:border-transparent bg-white"
                  >
                    <option value="">Seleccionar profesor</option>
                    {profesores.map((p) => <option key={p.idProfesor} value={p.idProfesor}>{p.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre del Profesor (Manual)</label>
                  <input
                    type="text"
                    value={nuevoGrupo.nombreProfesor || ''}
                    onChange={(e) => setNuevoGrupo({ ...nuevoGrupo, nombreProfesor: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#26AAA3] focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-100">
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Día</label>
                  <select
                    value={nuevoGrupo.diaClase || 'Lunes'}
                    onChange={(e) => setNuevoGrupo({ ...nuevoGrupo, diaClase: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#26AAA3] bg-white"
                  >
                    {['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'].map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Hora</label>
                  <input
                    type="time"
                    value={nuevoGrupo.horaClase || '10:00'}
                    onChange={(e) => setNuevoGrupo({ ...nuevoGrupo, horaClase: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#26AAA3]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Duración</label>
                  <select
                    value={nuevoGrupo.duracionClase || '2 horas'}
                    onChange={(e) => setNuevoGrupo({ ...nuevoGrupo, duracionClase: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#26AAA3] bg-white"
                  >
                    {['1 hora','1:30 hr','2 horas','2:30 hr','3 horas'].map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Capacidad</label>
                  <input
                    type="number"
                    value={nuevoGrupo.CapacidadMaxima || 20}
                    onChange={(e) => setNuevoGrupo({ ...nuevoGrupo, CapacidadMaxima: parseInt(e.target.value) || 1 })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#26AAA3]"
                    min="1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Comentarios Internos</label>
                <input
                  type="text"
                  value={nuevoGrupo.comentario || ''}
                  onChange={(e) => setNuevoGrupo({ ...nuevoGrupo, comentario: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#26AAA3]"
                  placeholder="Opcional"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-gray-100">
              <button onClick={() => setShowModalCrear(false)} className="px-5 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">Cancelar</button>
              <button onClick={handleCrearGrupo} className="px-6 py-2.5 bg-[#1E293B] text-white rounded-lg text-sm font-bold shadow-md hover:bg-gray-800">Crear Grupo</button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL EDITAR */}
      {/* ============================================================ */}
      {showModal && grupoEditando && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50 rounded-t-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#1E293B] rounded-lg flex items-center justify-center text-white shadow-sm">
                  <Edit2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Editar Grupo</h3>
                  <p className="text-sm text-gray-500">ID: {grupoEditando.IdGrupo}</p>
                </div>
              </div>
            </div>
            
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Curso (Catálogo)</label>
                  <select
                    value={grupoEditando.idCurso}
                    onChange={(e) => {
                      const curso = cursos.find(c => c.idCurso === e.target.value);
                      setGrupoEditando({ ...grupoEditando, idCurso: e.target.value, nombreCurso: curso ? curso.nombreCurso : grupoEditando.nombreCurso });
                    }}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#26AAA3] bg-white"
                  >
                    <option value="">Seleccionar curso</option>
                    {cursos.map((c) => <option key={c.idCurso} value={c.idCurso}>{c.nombreCurso}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre del Curso (Manual)</label>
                  <input
                    type="text"
                    value={grupoEditando.nombreCurso}
                    onChange={(e) => setGrupoEditando({ ...grupoEditando, nombreCurso: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#26AAA3]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Profesor (Catálogo)</label>
                  <select
                    value={grupoEditando.idProfesor}
                    onChange={(e) => {
                      const prof = profesores.find(p => p.idProfesor === e.target.value);
                      setGrupoEditando({ ...grupoEditando, idProfesor: e.target.value, nombreProfesor: prof ? prof.nombre : grupoEditando.nombreProfesor });
                    }}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#26AAA3] bg-white"
                  >
                    <option value="">Seleccionar profesor</option>
                    {profesores.map((p) => <option key={p.idProfesor} value={p.idProfesor}>{p.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre del Profesor (Manual)</label>
                  <input
                    type="text"
                    value={grupoEditando.nombreProfesor}
                    onChange={(e) => setGrupoEditando({ ...grupoEditando, nombreProfesor: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#26AAA3]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-100">
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Día</label>
                  <select
                    value={grupoEditando.diaClase}
                    onChange={(e) => setGrupoEditando({ ...grupoEditando, diaClase: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#26AAA3] bg-white"
                  >
                    {['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'].map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Hora</label>
                  <input
                    type="time"
                    value={grupoEditando.horaClase}
                    onChange={(e) => setGrupoEditando({ ...grupoEditando, horaClase: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#26AAA3]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Duración</label>
                  <select
                    value={grupoEditando.duracionClase}
                    onChange={(e) => setGrupoEditando({ ...grupoEditando, duracionClase: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#26AAA3] bg-white"
                  >
                    {['1 hora','1:30 hr','2 horas','2:30 hr','3 horas'].map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Capacidad</label>
                  <input
                    type="number"
                    value={grupoEditando.CapacidadMaxima}
                    onChange={(e) => setGrupoEditando({ ...grupoEditando, CapacidadMaxima: parseInt(e.target.value) || 1 })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#26AAA3]"
                    min="1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Comentarios Internos</label>
                <input
                  type="text"
                  value={grupoEditando.comentario}
                  onChange={(e) => setGrupoEditando({ ...grupoEditando, comentario: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#26AAA3]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-gray-100">
              <button onClick={() => setShowModal(false)} className="px-5 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">Cancelar</button>
              <button onClick={handleGuardar} className="px-6 py-2.5 bg-[#1E293B] text-white rounded-lg text-sm font-bold shadow-md hover:bg-gray-800">Guardar Cambios</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Componentes Auxiliares ---

function KpiCard({ titulo, valor, icon, color, bg }: { titulo: string, valor: string, icon: React.ReactNode, color: string, bg: string }) {
  return (
    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500 mb-1">{titulo}</p>
        <h3 className={`text-2xl font-bold ${color}`}>{valor}</h3>
      </div>
      <div className={`p-2.5 rounded-lg ${bg} ${color}`}>
        {icon}
      </div>
    </div>
  );
}