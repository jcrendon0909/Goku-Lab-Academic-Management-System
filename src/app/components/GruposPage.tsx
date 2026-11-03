import React, { useEffect, useState, useMemo } from 'react';
import { apiFetch } from '../../services/api';
import { toast } from 'sonner';
import { useSyncDataReload } from '../../utils/dataSync';
import { 
  Users, BookOpen, User, Activity, Search, Filter, 
  ChevronDown, ChevronRight, Edit2, Plus, Power, ShieldAlert, CheckCircle2
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

interface CursoAgrupado {
  idCurso: string;
  nombreCurso: string;
  grupos: Grupo[];
}

const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

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

  // Filtros y Acordeones (Nivel 1: Curso, Nivel 2: Grupo)
  const [cursoExpandido, setCursoExpandido] = useState<string | null>(null);
  const [grupoExpandido, setGrupoExpandido] = useState<string | null>(null);
  
  const [busqueda, setBusqueda] = useState('');
  const [filtroDia, setFiltroDia] = useState<string>('Todos');

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

      // Cargar alumnos de cada grupo
      const gruposConAlumnos = await Promise.all(
        gruposData.map(async (grupo: Grupo) => {
          try {
            const resInscripciones = await apiFetch(`/inscripciones/grupo/${grupo.IdGrupo}`);
            if (!resInscripciones.ok) return { ...grupo, alumnos: [], alumnosInscritos: grupo.alumnosInscritos || 0 };
            
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
  // ACCIONES
  // ============================================================

  const handleEditar = (e: React.MouseEvent, grupo: Grupo) => {
    e.stopPropagation(); // Evita que se abra/cierre el acordeón del grupo
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

      if (!res.ok) throw new Error((await res.json()).error || 'Error al actualizar');
      toast.success('✅ Grupo actualizado');
      setShowModal(false);
      cargarDatos();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleCrearGrupo = async () => {
    try {
      if (!nuevoGrupo.nombreCurso || !nuevoGrupo.diaClase || !nuevoGrupo.horaClase) {
        return toast.error('Faltan campos obligatorios');
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

      if (!res.ok) throw new Error((await res.json()).error || 'Error al crear grupo');
      
      toast.success('🎉 Grupo creado correctamente');
      setShowModalCrear(false);
      setNuevoGrupo({ nombreCurso: '', diaClase: 'Lunes', horaClase: '10:00', duracionClase: '2 horas', CapacidadMaxima: 20, Estatus: 'Activo' });
      cargarDatos();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const toggleEstatusGrupo = async (e: React.MouseEvent, grupo: Grupo) => {
    e.stopPropagation();
    
    if (grupo.Estatus === 'Activo' && (grupo.alumnosInscritos || 0) > 0) {
      return toast.error('No se puede desactivar un grupo con alumnos activos');
    }

    const nuevoEstatus = grupo.Estatus === 'Activo' ? 'Inactivo' : 'Activo';
    if (!confirm(`¿${nuevoEstatus === 'Inactivo' ? 'Desactivar' : 'Activar'} este grupo?`)) return;

    try {
      const res = await apiFetch(`/grupos/${grupo.IdGrupo}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Estatus: nuevoEstatus })
      });
      if (!res.ok) throw new Error('Error al cambiar estatus');
      toast.success(`Grupo ${nuevoEstatus.toLowerCase()} correctamente`);
      cargarDatos();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  // ============================================================
  // AGRUPACIÓN Y FILTRADO
  // ============================================================

  const cursosAgrupados = useMemo(() => {
    // 1. Filtrar grupos
    let gruposFiltrados = grupos.filter(g => {
      const matchDia = filtroDia === 'Todos' || g.diaClase === filtroDia;
      const matchBusqueda = !busqueda || 
        g.nombreCurso.toLowerCase().includes(busqueda.toLowerCase()) ||
        g.nombreProfesor.toLowerCase().includes(busqueda.toLowerCase()) ||
        g.IdGrupo.toLowerCase().includes(busqueda.toLowerCase()) ||
        (g.alumnos && g.alumnos.some(a => a.nombreAlumno.toLowerCase().includes(busqueda.toLowerCase())));
      
      return matchDia && matchBusqueda;
    });

    // 2. Agrupar por curso
    const agrupados: Record<string, CursoAgrupado> = {};

    gruposFiltrados.forEach(grupo => {
      // Si el grupo no tiene idCurso (raro), usamos el nombreCurso como ID
      const key = grupo.idCurso || grupo.nombreCurso;
      if (!agrupados[key]) {
        agrupados[key] = {
          idCurso: key,
          nombreCurso: grupo.nombreCurso,
          grupos: []
        };
      }
      agrupados[key].grupos.push(grupo);
    });

    // 3. Ordenar cursos alfabéticamente y los grupos por hora
    return Object.values(agrupados).sort((a, b) => a.nombreCurso.localeCompare(b.nombreCurso)).map(curso => {
      curso.grupos.sort((a, b) => a.horaClase.localeCompare(b.horaClase));
      return curso;
    });
  }, [grupos, filtroDia, busqueda]);

  // KPIs
  const totalAlumnos = grupos.reduce((sum, g) => sum + (g.alumnosInscritos || 0), 0);
  const gruposActivos = grupos.filter(g => g.Estatus === 'Activo').length;

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
          <p className="text-gray-500 text-sm mt-1">Organización jerárquica por Curso, Grupo y Alumnos</p>
        </div>
        <button
          onClick={() => setShowModalCrear(true)}
          className="px-5 py-2.5 bg-[#1E293B] text-white rounded-lg font-medium hover:bg-gray-800 transition-colors shadow-sm flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          Crear Grupo
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard titulo="Total Grupos" valor={grupos.length.toString()} icon={<BookOpen className="w-5 h-5" />} color="text-blue-600" bg="bg-blue-50" />
        <KpiCard titulo="Grupos Activos" valor={gruposActivos.toString()} icon={<Activity className="w-5 h-5" />} color="text-emerald-600" bg="bg-emerald-50" />
        <KpiCard titulo="Total Alumnos Inscritos" valor={totalAlumnos.toString()} icon={<Users className="w-5 h-5" />} color="text-purple-600" bg="bg-purple-50" />
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto flex-1">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Buscar alumno, profesor, grupo..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#26AAA3] focus:border-transparent"
            />
          </div>
          <div className="relative">
            <select
              value={filtroDia}
              onChange={(e) => setFiltroDia(e.target.value)}
              className="w-full sm:w-48 pl-3 pr-8 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#26AAA3] bg-white appearance-none"
            >
              <option value="Todos">📅 Todos los días</option>
              {DIAS_SEMANA.map(d => (
                <option key={d} value={d}>📅 {d}</option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <ChevronDown className="h-4 w-4 text-gray-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Cursos (Nivel 1) */}
      <div className="space-y-4">
        {cursosAgrupados.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
            <Filter className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-700 mb-1">No hay grupos que coincidan</h3>
            <p className="text-gray-500">Prueba cambiando el filtro de día o la búsqueda.</p>
          </div>
        ) : (
          cursosAgrupados.map((curso) => {
            const isCursoExpanded = cursoExpandido === curso.idCurso;
            
            return (
              <div key={curso.idCurso} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden transition-all duration-300">
                
                {/* Header del Curso */}
                <button 
                  onClick={() => setCursoExpandido(isCursoExpanded ? null : curso.idCurso)}
                  className={`w-full flex items-center justify-between p-5 transition-colors ${isCursoExpanded ? 'bg-[#26AAA3]/5' : 'hover:bg-gray-50'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isCursoExpanded ? 'bg-[#26AAA3] text-white' : 'bg-gray-100 text-gray-500'}`}>
                      <BookOpen className="h-5 w-5" />
                    </div>
                    <div className="text-left">
                      <h2 className="text-lg font-bold text-gray-900">{curso.nombreCurso}</h2>
                      <p className="text-sm text-gray-500">{curso.grupos.length} {curso.grupos.length === 1 ? 'grupo' : 'grupos'} abiertos</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="bg-white border border-gray-200 text-gray-600 text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                      {curso.grupos.reduce((sum, g) => sum + (g.alumnosInscritos || 0), 0)} alumnos
                    </span>
                    {isCursoExpanded ? <ChevronDown className="h-5 w-5 text-gray-400" /> : <ChevronRight className="h-5 w-5 text-gray-400" />}
                  </div>
                </button>

                {/* Lista de Grupos (Nivel 2) */}
                {isCursoExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50/50 p-4">
                    <div className="grid grid-cols-1 gap-3">
                      {curso.grupos.map((grupo) => {
                        const isGrupoExpanded = grupoExpandido === grupo.IdGrupo;
                        const ocupacionPct = grupo.CapacidadMaxima > 0 ? ((grupo.alumnosInscritos || 0) / grupo.CapacidadMaxima) * 100 : 0;
                        
                        let ocupacionColor = 'bg-emerald-500';
                        if (ocupacionPct >= 100) ocupacionColor = 'bg-rose-500';
                        else if (ocupacionPct >= 80) ocupacionColor = 'bg-amber-500';

                        return (
                          <div key={grupo.IdGrupo} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                            
                            {/* Header del Grupo */}
                            <div 
                              onClick={() => setGrupoExpandido(isGrupoExpanded ? null : grupo.IdGrupo)}
                              className="flex flex-col md:flex-row md:items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors gap-4"
                            >
                              <div className="flex items-center gap-4 flex-1">
                                {isGrupoExpanded ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
                                
                                <div className="flex flex-col">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">{grupo.IdGrupo}</span>
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                      grupo.Estatus === 'Activo' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                                    }`}>
                                      {grupo.Estatus}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-3 mt-1 text-sm text-gray-700 font-medium">
                                    <span className="flex items-center gap-1"><Activity className="h-3.5 w-3.5 text-gray-400" /> {grupo.diaClase} · {grupo.horaClase}</span>
                                    <span className="text-gray-300">|</span>
                                    <span className="flex items-center gap-1"><User className="h-3.5 w-3.5 text-gray-400" /> {grupo.nombreProfesor || 'Sin asignar'}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center justify-between md:justify-end gap-6 md:w-1/3">
                                <div className="flex flex-col w-32">
                                  <div className="flex justify-between text-xs font-bold text-gray-600 mb-1">
                                    <span>Ocupación</span>
                                    <span>{grupo.alumnosInscritos || 0}/{grupo.CapacidadMaxima}</span>
                                  </div>
                                  <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full ${ocupacionColor}`} style={{ width: `${Math.min(ocupacionPct, 100)}%` }}></div>
                                  </div>
                                </div>

                                <div className="flex gap-2">
                                  <button
                                    onClick={(e) => handleEditar(e, grupo)}
                                    className="p-2 text-gray-400 hover:text-[#26AAA3] hover:bg-[#26AAA3]/10 rounded-lg transition-colors bg-white border border-gray-200 shadow-sm"
                                    title="Editar grupo"
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={(e) => toggleEstatusGrupo(e, grupo)}
                                    disabled={grupo.Estatus === 'Activo' && (grupo.alumnosInscritos || 0) > 0}
                                    className={`p-2 rounded-lg transition-colors bg-white border border-gray-200 shadow-sm ${
                                      grupo.Estatus === 'Activo' ? 'text-gray-400 hover:text-rose-600 hover:bg-rose-50' : 'text-gray-400 hover:text-emerald-600 hover:bg-emerald-50'
                                    } disabled:opacity-30 disabled:cursor-not-allowed`}
                                    title={grupo.Estatus === 'Activo' ? 'Desactivar grupo' : 'Activar grupo'}
                                  >
                                    <Power className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Lista de Alumnos (Nivel 3) */}
                            {isGrupoExpanded && (
                              <div className="border-t border-gray-100 bg-gray-50/30 p-4">
                                <h4 className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-2">
                                  <Users className="h-4 w-4" /> Alumnos Inscritos ({grupo.alumnos?.length || 0})
                                </h4>
                                {grupo.alumnos && grupo.alumnos.length > 0 ? (
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                    {grupo.alumnos.map((alumno) => (
                                      <div key={alumno.idAlumno} className="bg-white border border-gray-200 rounded-lg p-2.5 shadow-sm flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                                            <User className="h-3 w-3" />
                                          </div>
                                          <span className="font-bold text-gray-800 text-sm truncate max-w-[150px]">{alumno.nombreAlumno}</span>
                                        </div>
                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                                          alumno.modalidad === 'Virtual' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                                        }`}>
                                          {alumno.modalidad}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="bg-white border border-gray-100 rounded-lg p-6 text-center text-sm text-gray-500 shadow-sm">
                                    No hay alumnos inscritos en este grupo actualmente.
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ============================================================ */}
      {/* MODALES (CREAR Y EDITAR) */}
      {/* ============================================================ */}
      {showModalCrear && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50 rounded-t-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#1E293B] rounded-lg flex items-center justify-center text-white shadow-sm"><Plus className="h-5 w-5" /></div>
                <div><h3 className="text-xl font-bold text-gray-900">Crear Nuevo Grupo</h3><p className="text-sm text-gray-500">Configura el horario y la capacidad</p></div>
              </div>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Curso (Catálogo)</label>
                  <select value={nuevoGrupo.idCurso || ''} onChange={(e) => { const c = cursos.find(x => x.idCurso === e.target.value); setNuevoGrupo({ ...nuevoGrupo, idCurso: e.target.value, nombreCurso: c ? c.nombreCurso : nuevoGrupo.nombreCurso }); }} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#26AAA3] bg-white">
                    <option value="">Seleccionar curso</option>
                    {cursos.map((c) => <option key={c.idCurso} value={c.idCurso}>{c.nombreCurso}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre del Curso (Manual)</label>
                  <input type="text" value={nuevoGrupo.nombreCurso || ''} onChange={(e) => setNuevoGrupo({ ...nuevoGrupo, nombreCurso: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#26AAA3]" placeholder="Ej. Robótica Básica" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Profesor (Catálogo)</label>
                  <select value={nuevoGrupo.idProfesor || ''} onChange={(e) => { const p = profesores.find(x => x.idProfesor === e.target.value); setNuevoGrupo({ ...nuevoGrupo, idProfesor: e.target.value, nombreProfesor: p ? p.nombre : nuevoGrupo.nombreProfesor }); }} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#26AAA3] bg-white">
                    <option value="">Seleccionar profesor</option>
                    {profesores.map((p) => <option key={p.idProfesor} value={p.idProfesor}>{p.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre del Profesor (Manual)</label>
                  <input type="text" value={nuevoGrupo.nombreProfesor || ''} onChange={(e) => setNuevoGrupo({ ...nuevoGrupo, nombreProfesor: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#26AAA3]" />
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-100">
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Día</label>
                  <select value={nuevoGrupo.diaClase || 'Lunes'} onChange={(e) => setNuevoGrupo({ ...nuevoGrupo, diaClase: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#26AAA3] bg-white">
                    {DIAS_SEMANA.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Hora</label>
                  <input type="time" value={nuevoGrupo.horaClase || '10:00'} onChange={(e) => setNuevoGrupo({ ...nuevoGrupo, horaClase: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#26AAA3]" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Duración</label>
                  <select value={nuevoGrupo.duracionClase || '2 horas'} onChange={(e) => setNuevoGrupo({ ...nuevoGrupo, duracionClase: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#26AAA3] bg-white">
                    {['1 hora','1:30 hr','2 horas','2:30 hr','3 horas'].map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Capacidad</label>
                  <input type="number" value={nuevoGrupo.CapacidadMaxima || 20} onChange={(e) => setNuevoGrupo({ ...nuevoGrupo, CapacidadMaxima: parseInt(e.target.value) || 1 })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#26AAA3]" min="1" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Comentarios Internos</label>
                <input type="text" value={nuevoGrupo.comentario || ''} onChange={(e) => setNuevoGrupo({ ...nuevoGrupo, comentario: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#26AAA3]" placeholder="Opcional" />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-gray-100">
              <button onClick={() => setShowModalCrear(false)} className="px-5 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">Cancelar</button>
              <button onClick={handleCrearGrupo} className="px-6 py-2.5 bg-[#1E293B] text-white rounded-lg text-sm font-bold shadow-md hover:bg-gray-800">Crear Grupo</button>
            </div>
          </div>
        </div>
      )}

      {showModal && grupoEditando && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50 rounded-t-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#1E293B] rounded-lg flex items-center justify-center text-white shadow-sm"><Edit2 className="h-5 w-5" /></div>
                <div><h3 className="text-xl font-bold text-gray-900">Editar Grupo</h3><p className="text-sm text-gray-500">ID: {grupoEditando.IdGrupo}</p></div>
              </div>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Curso (Catálogo)</label>
                  <select value={grupoEditando.idCurso} onChange={(e) => { const c = cursos.find(x => x.idCurso === e.target.value); setGrupoEditando({ ...grupoEditando, idCurso: e.target.value, nombreCurso: c ? c.nombreCurso : grupoEditando.nombreCurso }); }} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#26AAA3] bg-white">
                    <option value="">Seleccionar curso</option>
                    {cursos.map((c) => <option key={c.idCurso} value={c.idCurso}>{c.nombreCurso}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre del Curso (Manual)</label>
                  <input type="text" value={grupoEditando.nombreCurso} onChange={(e) => setGrupoEditando({ ...grupoEditando, nombreCurso: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#26AAA3]" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Profesor (Catálogo)</label>
                  <select value={grupoEditando.idProfesor} onChange={(e) => { const p = profesores.find(x => x.idProfesor === e.target.value); setGrupoEditando({ ...grupoEditando, idProfesor: e.target.value, nombreProfesor: p ? p.nombre : grupoEditando.nombreProfesor }); }} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#26AAA3] bg-white">
                    <option value="">Seleccionar profesor</option>
                    {profesores.map((p) => <option key={p.idProfesor} value={p.idProfesor}>{p.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre del Profesor (Manual)</label>
                  <input type="text" value={grupoEditando.nombreProfesor} onChange={(e) => setGrupoEditando({ ...grupoEditando, nombreProfesor: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#26AAA3]" />
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-100">
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Día</label>
                  <select value={grupoEditando.diaClase} onChange={(e) => setGrupoEditando({ ...grupoEditando, diaClase: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#26AAA3] bg-white">
                    {DIAS_SEMANA.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Hora</label>
                  <input type="time" value={grupoEditando.horaClase} onChange={(e) => setGrupoEditando({ ...grupoEditando, horaClase: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#26AAA3]" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Duración</label>
                  <select value={grupoEditando.duracionClase} onChange={(e) => setGrupoEditando({ ...grupoEditando, duracionClase: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#26AAA3] bg-white">
                    {['1 hora','1:30 hr','2 horas','2:30 hr','3 horas'].map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Capacidad</label>
                  <input type="number" value={grupoEditando.CapacidadMaxima} onChange={(e) => setGrupoEditando({ ...grupoEditando, CapacidadMaxima: parseInt(e.target.value) || 1 })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#26AAA3]" min="1" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Comentarios Internos</label>
                <input type="text" value={grupoEditando.comentario} onChange={(e) => setGrupoEditando({ ...grupoEditando, comentario: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#26AAA3]" />
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