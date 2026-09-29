import React, { useEffect, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { apiFetch, getProfesores } from '../../services/api';
import { toast } from 'sonner';
import BackgroundVideo from './BackgroundVideo';
import {
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Clock,
  Users,
  Save,
  UserCheck,
  UserX,
  AlertCircle,
  Loader2,
  Repeat,
  UserCog,
  Ban,
  CalendarX,
  CheckCircle2,
} from 'lucide-react';

// ============================================================
// TIPOS
// ============================================================

interface Alumno {
  idAlumno: string;
  nombreAlumno: string;
  modalidad: string;
  estadoAsistencia?: string;
  comentarioAsistencia?: string;
}

interface GrupoAsistencia {
  idGrupo: string;
  nombreCurso: string;
  diaClase: string;
  horaClase: string;
  duracionClase: string;
  idSesion?: string;
  estadoSesion?: 'programada' | 'dada' | 'cancelada' | 'no_asistio';
  esSustitucion?: boolean;
  idProfesorReal?: string;
  nombreProfesorReal?: string;
  alumnos: Alumno[];
  esReagendacion?: boolean;
  reagendacionId?: string;
}

type EstadoAlumno = 'presente' | 'ausente' | 'justificado' | 'retardo' | 'reagendado' | 'pendiente';

interface AsistenciaState {
  [key: string]: {
    estado: EstadoAlumno;
    comentario: string;
  };
}

interface Profesor {
  idProfesor: string;
  nombre: string;
}

// ============================================================
// CONSTANTES
// ============================================================

const ESTADOS_ALUMNO: {
  value: EstadoAlumno;
  label: string;
  icon: React.ReactNode;
  color: string;
}[] = [
  { value: 'presente', label: 'Presente', icon: <Check className="w-4 h-4" />, color: 'bg-emerald-500' },
  { value: 'ausente', label: 'Ausente', icon: <X className="w-4 h-4" />, color: 'bg-rose-500' },
  { value: 'justificado', label: 'Justificado', icon: <AlertCircle className="w-4 h-4" />, color: 'bg-amber-500' },
  { value: 'retardo', label: 'Retardo', icon: <Clock className="w-4 h-4" />, color: 'bg-blue-500' },
  { value: 'reagendado', label: 'Reagendado', icon: <Repeat className="w-4 h-4" />, color: 'bg-purple-500' },
];

const ESTADO_SESION_BADGE: Record<string, { label: string; classes: string }> = {
  programada: { label: 'Programada', classes: 'bg-white/20 text-white' },
  dada: { label: 'Dada', classes: 'bg-emerald-500/80 text-white' },
  cancelada: { label: 'Cancelada', classes: 'bg-rose-500/80 text-white' },
  no_asistio: { label: 'No asistió', classes: 'bg-amber-500/80 text-gray-900' },
};

// ============================================================
// COMPONENTE
// ============================================================

export function AsistenciaPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.rol === 'admin';

  // Profesor activo (profe logueado o el que elige el admin)
  const [idProfesor, setIdProfesor] = useState<string>(user.idProfesor || '');
  const [profesores, setProfesores] = useState<Profesor[]>([]);

  const [fecha, setFecha] = useState(() => {
    const params = new URLSearchParams(location.search);
    return params.get('fecha') || new Date().toLocaleDateString('en-CA');
  });
  const [grupos, setGrupos] = useState<GrupoAsistencia[]>([]);
  const [asistencias, setAsistencias] = useState<Record<string, AsistenciaState>>({});
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [resumen, setResumen] = useState({ total: 0, presentes: 0, ausentes: 0 });

  // ============================================================
  // EFECTOS
  // ============================================================

  // Cargar lista de profesores si es admin
  useEffect(() => {
    if (isAdmin) {
      getProfesores()
        .then((data: Profesor[]) => setProfesores(data))
        .catch(() => toast.error('Error al cargar profesores'));
    }
  }, [isAdmin]);

  // Actualizar la URL con la fecha
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    params.set('fecha', fecha);
    navigate(`${location.pathname}?${params.toString()}`, { replace: true });
  }, [fecha]);

  // ============================================================
  // CARGA DE DATOS
  // ============================================================

  const cargarDatos = useCallback(async () => {
    if (!idProfesor) {
      setGrupos([]);
      setCargando(false);
      return;
    }

    try {
      setCargando(true);
      const res = await apiFetch(`/asistencia/profesor/${idProfesor}?fecha=${fecha}`);
      if (!res.ok) throw new Error('Error al cargar datos');
      const data: GrupoAsistencia[] = await res.json();
      setGrupos(data);

      const initialAsistencias: Record<string, AsistenciaState> = {};
      data.forEach((grupo) => {
        grupo.alumnos.forEach((alumno) => {
          const key = `${alumno.idAlumno}-${grupo.idGrupo}`;
          initialAsistencias[key] = {
            estado: (alumno.estadoAsistencia as EstadoAlumno) || 'ausente',
            comentario: alumno.comentarioAsistencia || '',
          };
        });
      });
      setAsistencias(initialAsistencias);
      calcularResumen(initialAsistencias);
    } catch (error: any) {
      console.error('Error cargando datos:', error);
      toast.error(error.message || 'Error al cargar datos');
    } finally {
      setCargando(false);
    }
  }, [idProfesor, fecha]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // ============================================================
  // HELPERS
  // ============================================================

  const calcularResumen = (state: Record<string, AsistenciaState>) => {
    const values = Object.values(state);
    const total = values.length;
    const presentes = values.filter((v) => v.estado === 'presente').length;
    setResumen({ total, presentes, ausentes: total - presentes });
  };

  const cambiarFecha = (dias: number) => {
    const nuevaFecha = new Date(fecha + 'T12:00:00');
    nuevaFecha.setDate(nuevaFecha.getDate() + dias);
    setFecha(nuevaFecha.toLocaleDateString('en-CA'));
  };

  const hoy = new Date().toLocaleDateString('en-CA');

  // ============================================================
  // HANDLERS DE ALUMNOS
  // ============================================================

  const handleEstadoChange = (alumnoId: string, grupoId: string, estado: EstadoAlumno) => {
    const key = `${alumnoId}-${grupoId}`;
    setAsistencias((prev) => {
      const newState = {
        ...prev,
        [key]: { ...prev[key], estado },
      };
      calcularResumen(newState);
      return newState;
    });
  };

  const handleMarcarTodos = (grupoId: string, estado: EstadoAlumno) => {
    const grupo = grupos.find((g) => g.idGrupo === grupoId);
    if (!grupo) return;
    setAsistencias((prev) => {
      const newState = { ...prev };
      grupo.alumnos.forEach((alumno) => {
        const key = `${alumno.idAlumno}-${grupoId}`;
        newState[key] = { ...newState[key], estado };
      });
      calcularResumen(newState);
      return newState;
    });
  };

  // ============================================================
  // HANDLERS DE SESIÓN (solo admin)
  // ============================================================

  const handleCambiarEstadoSesion = async (
    grupo: GrupoAsistencia,
    nuevoEstado: 'dada' | 'cancelada' | 'no_asistio' | 'programada'
  ) => {
    if (!grupo.idSesion) {
      toast.error('Este grupo no tiene sesión asociada');
      return;
    }

    let motivo = '';
    let canceladoPor = '';

    if (nuevoEstado === 'cancelada') {
      motivo = window.prompt('Motivo de la cancelación:', 'Clase cancelada') || '';
      if (!motivo) return;
      canceladoPor = 'institucional';
    } else if (nuevoEstado === 'no_asistio') {
      motivo = window.prompt('Motivo (ej. "El profesor no llegó"):', '') || '';
      canceladoPor = 'profesor';
    }

    try {
      const res = await apiFetch(`/asistencia/sesion/${grupo.idSesion}/estado`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estado: nuevoEstado,
          motivo,
          canceladoPor,
          registradoPor: user.idUsuario || user.usuario || '',
        }),
      });
      if (!res.ok) throw new Error('Error al cambiar estado');
      toast.success(`Sesión marcada como "${nuevoEstado}"`);
      await cargarDatos();
    } catch (error: any) {
      toast.error(error.message || 'Error al cambiar estado');
    }
  };

  const handleCambiarSustituto = async (grupo: GrupoAsistencia, idProfesorReal: string) => {
    if (!grupo.idSesion) {
      toast.error('Este grupo no tiene sesión asociada');
      return;
    }
    if (!idProfesorReal) {
      toast.error('Selecciona un profesor');
      return;
    }

    const profe = profesores.find((p) => p.idProfesor === idProfesorReal);

    try {
      const res = await apiFetch(`/asistencia/sesion/${grupo.idSesion}/sustituto`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idProfesorReal,
          nombreProfesorReal: profe?.nombre || '',
          motivoSustitucion: 'Sustituto asignado por admin',
        }),
      });
      if (!res.ok) throw new Error('Error al asignar sustituto');
      toast.success('Sustituto asignado');
      await cargarDatos();
    } catch (error: any) {
      toast.error(error.message || 'Error al asignar sustituto');
    }
  };

  // ============================================================
  // GUARDADO DE LISTA
  // ============================================================

  const handleGuardar = async () => {
    if (!idProfesor) return;
    if (grupos.length === 0) {
      toast.info('No hay grupos para guardar');
      return;
    }

    try {
      setGuardando(true);

      // Agrupar asistencias por sesión
      const porSesion: Record<string, { idAlumno: string; estado: EstadoAlumno; comentario: string }[]> = {};

      Object.entries(asistencias).forEach(([key, value]) => {
        const [idAlumno, idGrupo] = key.split('-');
        const grupo = grupos.find((g) => g.idGrupo === idGrupo);
        if (!grupo || !grupo.idSesion) return;

        if (!porSesion[grupo.idSesion]) porSesion[grupo.idSesion] = [];
        porSesion[grupo.idSesion].push({
          idAlumno,
          estado: value.estado,
          comentario: value.comentario || '',
        });
      });

      // Llamar PUT por cada sesión
      let okCount = 0;
      const promises = Object.entries(porSesion).map(async ([idSesion, alumnos]) => {
        const grupo = grupos.find((g) => g.idSesion === idSesion);
        const estadoSesion = grupo?.estadoSesion === 'cancelada' ? 'cancelada' : 'dada';

        const res = await apiFetch(`/asistencia/sesion/${idSesion}/lista`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            alumnos,
            estadoSesion,
            registradoPor: user.idUsuario || user.usuario || '',
          }),
        });
        if (res.ok) okCount++;
        return res.ok;
      });

      await Promise.all(promises);

      if (okCount === Object.keys(porSesion).length) {
        toast.success(`Lista guardada en ${okCount} sesión(es)`);
      } else {
        toast.warning(`Guardadas ${okCount} de ${Object.keys(porSesion).length} sesiones`);
      }
      await cargarDatos();
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  // ============================================================
  // RENDERS AUXILIARES
  // ============================================================

  const decorativeVideos: { src: string; position: any }[] = [];

  if (cargando && idProfesor) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center text-white">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" />
          <p className="text-lg font-bold">Cargando grupos...</p>
        </div>
      </div>
    );
  }

  return (
    <BackgroundVideo
      videoSrc="https://media.gokulab.mx/Galery/videos/lummyanimado.mp4"
      decorativeVideos={decorativeVideos}
    >
      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 md:px-8 h-full flex flex-col py-1 mt-[30px]">
        {/* Cabecera */}
        <div className="flex flex-col md:flex-row items-center justify-between mb-4 gap-3 flex-shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-extrabold text-white drop-shadow-lg flex items-center gap-3">
              <span className="bg-gradient-to-r from-[#26AAA3] to-[#67A934] p-2 rounded-full shadow-lg inline-flex items-center justify-center">
                <Users className="h-6 w-6 text-white" />
              </span>
              <span className="bg-gradient-to-r from-[#26AAA3] via-[#67A934] to-[#F8B50E] text-transparent bg-clip-text">
                Pasar Lista
              </span>
            </h1>
            <span className="text-white/50 text-sm hidden md:inline">
              {new Date(fecha + 'T12:00:00').toLocaleDateString('es-ES', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isAdmin && (
              <select
                value={idProfesor}
                onChange={(e) => setIdProfesor(e.target.value)}
                className="bg-white/20 backdrop-blur-sm border border-white/20 rounded-full px-3 py-2 text-white text-sm focus:outline-none"
              >
                <option value="">Seleccionar profesor...</option>
                {profesores.map((p) => (
                  <option key={p.idProfesor} value={p.idProfesor} className="text-gray-900">
                    {p.nombre}
                  </option>
                ))}
              </select>
            )}
            <div className="flex items-center bg-white/20 backdrop-blur-sm rounded-full border border-white/20 p-1">
              <button
                onClick={() => cambiarFecha(-1)}
                className="p-1.5 rounded-full hover:bg-white/20 transition-colors text-white"
                title="Día anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="bg-transparent text-white text-sm px-2 py-1 focus:outline-none w-32"
              />
              <button
                onClick={() => cambiarFecha(1)}
                className="p-1.5 rounded-full hover:bg-white/20 transition-colors text-white"
                title="Día siguiente"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              {fecha !== hoy && (
                <button
                  onClick={() => setFecha(hoy)}
                  className="ml-1 px-2 py-1 text-[10px] font-bold bg-[#F8B50E]/80 text-gray-900 rounded-full hover:bg-[#F8B50E] transition"
                >
                  Hoy
                </button>
              )}
            </div>
            <button
              onClick={handleGuardar}
              disabled={guardando || grupos.length === 0}
              className="bg-gradient-to-r from-[#26AAA3] to-[#67A934] text-white px-4 py-2 rounded-full font-bold hover:scale-105 transition-all shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {guardando ? 'Guardando...' : 'Guardar todo'}
            </button>
          </div>
        </div>

        {/* Selector de profesor para admin cuando no hay uno elegido */}
        {isAdmin && !idProfesor && (
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-12 text-center border border-white/20">
            <UserCog className="w-16 h-16 text-white/40 mx-auto mb-4" />
            <p className="text-white text-lg font-medium">Selecciona un profesor para comenzar</p>
            <p className="text-white/60 text-sm mt-2">Usa el selector de arriba.</p>
          </div>
        )}

        {/* Resumen rápido */}
        {grupos.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-4 flex-shrink-0">
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 text-center border border-white/20">
              <p className="text-xs text-white/60">Total alumnos</p>
              <p className="text-2xl font-bold text-white">{resumen.total}</p>
            </div>
            <div className="bg-emerald-500/20 backdrop-blur-sm rounded-xl p-3 text-center border border-emerald-500/30">
              <p className="text-xs text-emerald-200">Presentes</p>
              <p className="text-2xl font-bold text-emerald-300">{resumen.presentes}</p>
            </div>
            <div className="bg-rose-500/20 backdrop-blur-sm rounded-xl p-3 text-center border border-rose-500/30">
              <p className="text-xs text-rose-200">Ausentes</p>
              <p className="text-2xl font-bold text-rose-300">{resumen.ausentes}</p>
            </div>
          </div>
        )}

        {/* Contenido principal */}
        <div className="flex-1 overflow-y-auto pb-4 space-y-4">
          {idProfesor && grupos.length === 0 ? (
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-12 text-center border border-white/20">
              <p className="text-white text-lg font-medium">📭 No hay clases programadas para este día</p>
              <p className="text-white/60 text-sm mt-2">Selecciona otra fecha o revisa el calendario.</p>
            </div>
          ) : (
            grupos.map((grupo) => {
              const grupoKey = grupo.idGrupo;
              const alumnosGrupo = grupo.alumnos;
              const estadoSesion = grupo.estadoSesion || 'programada';
              const badge = ESTADO_SESION_BADGE[estadoSesion] || ESTADO_SESION_BADGE.programada;

              return (
                <div
                  key={grupoKey}
                  className={`bg-white/10 backdrop-blur-md rounded-2xl border shadow-lg overflow-hidden ${
                    estadoSesion === 'cancelada'
                      ? 'border-rose-500/40'
                      : estadoSesion === 'no_asistio'
                      ? 'border-amber-500/40'
                      : 'border-white/20'
                  }`}
                >
                  {/* Cabecera del grupo */}
                  <div className="p-4 bg-gradient-to-r from-[#26AAA3]/30 to-[#67A934]/30 border-b border-white/10">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2 flex-wrap">
                          {grupo.nombreCurso}
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${badge.classes}`}>
                            {badge.label}
                          </span>
                          {grupo.esReagendacion && (
                            <span className="text-[10px] bg-[#F8B50E] text-gray-900 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                              <Repeat className="w-3 h-3" /> Reagendada
                            </span>
                          )}
                          {grupo.esSustitucion && (
                            <span className="text-[10px] bg-blue-500/80 text-white px-2 py-0.5 rounded-full font-bold">
                              Sustituto: {grupo.nombreProfesorReal}
                            </span>
                          )}
                        </h3>
                        <p className="text-sm text-white/70 flex items-center gap-2 mt-1">
                          <Clock className="w-3.5 h-3.5" />
                          {grupo.diaClase} {grupo.horaClase} • {grupo.duracionClase}
                          <span className="w-1 h-1 bg-white/30 rounded-full" />
                          <Users className="w-3.5 h-3.5" />
                          {alumnosGrupo.length} alumnos
                        </p>
                      </div>

                      {/* Controles admin */}
                      {isAdmin && grupo.idSesion && (
                        <div className="flex flex-wrap gap-2">
                          <select
                            value={grupo.idProfesorReal || ''}
                            onChange={(e) => handleCambiarSustituto(grupo, e.target.value)}
                            className="text-xs bg-white/10 border border-white/20 rounded-full px-2 py-1 text-white focus:outline-none"
                            title="Asignar profesor sustituto"
                          >
                            <option value="">Sustituto...</option>
                            {profesores.map((p) => (
                              <option key={p.idProfesor} value={p.idProfesor} className="text-gray-900">
                                {p.nombre}
                              </option>
                            ))}
                          </select>

                          {estadoSesion !== 'dada' && (
                            <button
                              onClick={() => handleCambiarEstadoSesion(grupo, 'dada')}
                              className="text-xs bg-emerald-500/80 hover:bg-emerald-500 text-white px-3 py-1 rounded-full font-bold flex items-center gap-1"
                              title="Marcar como dada"
                            >
                              <CheckCircle2 className="w-3 h-3" /> Dada
                            </button>
                          )}
                          {estadoSesion !== 'cancelada' && (
                            <button
                              onClick={() => handleCambiarEstadoSesion(grupo, 'cancelada')}
                              className="text-xs bg-rose-500/80 hover:bg-rose-500 text-white px-3 py-1 rounded-full font-bold flex items-center gap-1"
                              title="Marcar como cancelada"
                            >
                              <Ban className="w-3 h-3" /> Cancelar
                            </button>
                          )}
                          {estadoSesion !== 'no_asistio' && (
                            <button
                              onClick={() => handleCambiarEstadoSesion(grupo, 'no_asistio')}
                              className="text-xs bg-amber-500/80 hover:bg-amber-500 text-gray-900 px-3 py-1 rounded-full font-bold flex items-center gap-1"
                              title="Marcar como no asistió"
                            >
                              <CalendarX className="w-3 h-3" /> No asistió
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Botones marcar todos */}
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => handleMarcarTodos(grupoKey, 'presente')}
                        className="px-3 py-1 bg-emerald-500/80 hover:bg-emerald-500 text-white rounded-full text-xs font-bold transition flex items-center gap-1"
                      >
                        <UserCheck className="w-3 h-3" /> Todos presentes
                      </button>
                      <button
                        onClick={() => handleMarcarTodos(grupoKey, 'ausente')}
                        className="px-3 py-1 bg-rose-500/80 hover:bg-rose-500 text-white rounded-full text-xs font-bold transition flex items-center gap-1"
                      >
                        <UserX className="w-3 h-3" /> Todos ausentes
                      </button>
                    </div>
                  </div>

                  {/* Lista de alumnos */}
                  <div className="p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                      {alumnosGrupo.map((alumno) => {
                        const key = `${alumno.idAlumno}-${grupoKey}`;
                        const estadoActual = asistencias[key]?.estado || 'ausente';
                        const comentario = asistencias[key]?.comentario || '';

                        return (
                          <div
                            key={alumno.idAlumno}
                            className={`bg-white/5 rounded-xl p-3 border transition-all group ${
                              estadoActual === 'presente'
                                ? 'border-emerald-500/30 bg-emerald-500/10'
                                : estadoActual === 'ausente'
                                ? 'border-rose-500/30 bg-rose-500/10'
                                : estadoActual === 'justificado'
                                ? 'border-amber-500/30 bg-amber-500/10'
                                : estadoActual === 'retardo'
                                ? 'border-blue-500/30 bg-blue-500/10'
                                : estadoActual === 'reagendado'
                                ? 'border-purple-500/30 bg-purple-500/10'
                                : 'border-white/10'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-8 h-8 rounded-full bg-[#26AAA3]/30 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                  {alumno.nombreAlumno.charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium text-white truncate" title={alumno.nombreAlumno}>
                                    {alumno.nombreAlumno}
                                  </p>
                                  <span className="text-[10px] text-white/50">{alumno.modalidad}</span>
                                </div>
                              </div>
                              <div className="flex gap-1 flex-shrink-0">
                                {ESTADOS_ALUMNO.map((est) => (
                                  <button
                                    key={est.value}
                                    onClick={() => handleEstadoChange(alumno.idAlumno, grupoKey, est.value)}
                                    className={`
                                      w-7 h-7 rounded-full flex items-center justify-center transition-all
                                      ${
                                        estadoActual === est.value
                                          ? `${est.color} text-white scale-110 shadow-md`
                                          : 'bg-white/10 text-white/40 hover:bg-white/20 hover:text-white/80'
                                      }
                                    `}
                                    title={est.label}
                                  >
                                    {est.icon}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div className="mt-2">
                              <input
                                type="text"
                                placeholder="Observación..."
                                value={comentario}
                                onChange={(e) => {
                                  setAsistencias((prev) => ({
                                    ...prev,
                                    [key]: { ...prev[key], comentario: e.target.value },
                                  }));
                                }}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white/80 placeholder-white/30 focus:outline-none focus:border-[#26AAA3] transition"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pie de página */}
        <div className="mt-2 flex justify-between items-center text-xs text-white/50 flex-shrink-0">
          <span>
            📋 {grupos.length} grupos · {resumen.total} alumnos
          </span>
          <span>
            🔄{' '}
            {new Date(fecha + 'T12:00:00').toLocaleDateString('es-ES', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </span>
        </div>
      </div>
    </BackgroundVideo>
  );
}