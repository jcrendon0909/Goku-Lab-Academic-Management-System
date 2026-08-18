import React, { useEffect, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { apiFetch } from '../../services/api';
import { toast } from 'sonner';
import BackgroundVideo from './BackgroundVideo';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Check,
  X,
  Clock,
  Users,
  Save,
  RefreshCw,
  UserCheck,
  UserX,
  AlertCircle,
  Loader2,
} from 'lucide-react';

interface Alumno {
  idAlumno: string;
  nombreAlumno: string;
  modalidad: string;
  estadoAsistencia?: string; // ✅ agregado
  comentarioAsistencia?: string; // ✅ agregado
}

interface GrupoAsistencia {
  idGrupo: string;
  nombreCurso: string;
  diaClase: string;
  horaClase: string;
  duracionClase: string;
  alumnos: Alumno[];
  esReagendacion?: boolean;
  reagendacionId?: string;
}

interface AsistenciaState {
  [key: string]: {
    estado: 'presente' | 'ausente' | 'justificado' | 'retardo';
    comentario: string;
  };
}

const ESTADOS = [
  { value: 'presente', label: 'Presente', icon: <Check className="w-4 h-4" />, color: 'bg-emerald-500' },
  { value: 'ausente', label: 'Ausente', icon: <X className="w-4 h-4" />, color: 'bg-rose-500' },
  { value: 'justificado', label: 'Justificado', icon: <AlertCircle className="w-4 h-4" />, color: 'bg-amber-500' },
  { value: 'retardo', label: 'Retardo', icon: <Clock className="w-4 h-4" />, color: 'bg-blue-500' },
];

export function AsistenciaPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const idProfesor = user.idProfesor;

  const [fecha, setFecha] = useState(() => {
    const params = new URLSearchParams(location.search);
    return params.get('fecha') || new Date().toISOString().split('T')[0];
  });
  const [grupos, setGrupos] = useState<GrupoAsistencia[]>([]);
  const [asistencias, setAsistencias] = useState<Record<string, AsistenciaState>>({});
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [resumen, setResumen] = useState({ total: 0, presentes: 0, ausentes: 0 });

  if (!idProfesor) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="bg-white/20 backdrop-blur-md rounded-2xl p-8 text-center max-w-md border border-white/20">
          <p className="text-white text-lg font-medium">⚠️ No se encontró tu perfil de profesor</p>
          <p className="text-white/70 text-sm mt-2">Contacta al administrador para asignarte un ID de profesor.</p>
        </div>
      </div>
    );
  }

  const cargarDatos = useCallback(async () => {
    try {
      setCargando(true);
      const res = await apiFetch(`/asistencia/profesor/${idProfesor}?fecha=${fecha}`);
      if (!res.ok) throw new Error('Error al cargar datos');
      const data = await res.json();
      setGrupos(data);

      // ✅ Inicializar con estados del backend
      const initialAsistencias: Record<string, AsistenciaState> = {};
      data.forEach((grupo: GrupoAsistencia) => {
        grupo.alumnos.forEach((alumno) => {
          const key = `${alumno.idAlumno}-${grupo.idGrupo}`;
          initialAsistencias[key] = {
            estado: (alumno.estadoAsistencia as 'presente' | 'ausente' | 'justificado' | 'retardo') || 'ausente',
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
    const params = new URLSearchParams(location.search);
    params.set('fecha', fecha);
    navigate(`${location.pathname}?${params.toString()}`, { replace: true });
  }, [fecha, cargarDatos]);

  const calcularResumen = (asistenciaState: Record<string, AsistenciaState>) => {
    const values = Object.values(asistenciaState);
    const total = values.length;
    const presentes = values.filter((v) => v.estado === 'presente').length;
    setResumen({ total, presentes, ausentes: total - presentes });
  };

  const handleEstadoChange = (alumnoId: string, grupoId: string, estado: string) => {
    const key = `${alumnoId}-${grupoId}`;
    setAsistencias((prev) => {
      const newState = {
        ...prev,
        [key]: { ...prev[key], estado: estado as any },
      };
      calcularResumen(newState);
      return newState;
    });
  };

  const handleMarcarTodos = (grupoId: string, estado: 'presente' | 'ausente') => {
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

  const handleGuardar = async () => {
  if (!idProfesor) return;
  try {
    setGuardando(true);
    const payload = Object.entries(asistencias).map(([key, value]) => {
      const [idAlumno, idGrupo] = key.split('-');
      return {
        idAlumno,
        idGrupo,
        idProfesor,
        fecha: fecha, // ✅ enviar string, no Date
        estado: value.estado,
        comentario: value.comentario || '',
      };
    });
    const res = await apiFetch('/asistencia/guardar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ asistencias: payload }),
    });
    if (!res.ok) throw new Error('Error al guardar');
    const data = await res.json();
    toast.success(`Asistencias guardadas (${data.modificadas} modificadas, ${data.insertadas} nuevas)`);
    cargarDatos();
  } catch (error: any) {
    toast.error(error.message);
  } finally {
    setGuardando(false);
  }
};
  const cambiarFecha = (dias: number) => {
    const nuevaFecha = new Date(fecha);
    nuevaFecha.setDate(nuevaFecha.getDate() + dias);
    setFecha(nuevaFecha.toISOString().split('T')[0]);
  };

  const hoy = new Date().toISOString().split('T')[0];

  if (cargando) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center text-white">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" />
          <p className="text-lg font-bold">Cargando grupos...</p>
        </div>
      </div>
    );
  }

  const decorativeVideos: { src: string; position: any }[] = [];

  return (
    <BackgroundVideo
      videoSrc="https://media.gokulab.mx/Galery/videos/lummyanimado.mp4"
      decorativeVideos={decorativeVideos}
    >
      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 md:px-8 h-full flex flex-col py-1 mt-[30px]">
        {/* Cabecera */}
        <div className="flex flex-col md:flex-row items-center justify-between mb-4 gap-3 flex-shrink-0">
          <h1 className="text-2xl md:text-3xl font-extrabold text-white drop-shadow-lg flex items-center gap-3">
            <span className="bg-gradient-to-r from-[#26AAA3] to-[#67A934] p-2 rounded-full shadow-lg inline-flex items-center justify-center">
              <Users className="h-6 w-6 text-white" />
            </span>
            <span className="bg-gradient-to-r from-[#26AAA3] via-[#67A934] to-[#F8B50E] text-transparent bg-clip-text">
              Asistencia
            </span>
          </h1>
          <div className="flex flex-wrap items-center gap-2">
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
              disabled={guardando}
              className="bg-gradient-to-r from-[#26AAA3] to-[#67A934] text-white px-4 py-2 rounded-full font-bold hover:scale-105 transition-all shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {guardando ? 'Guardando...' : 'Guardar todo'}
            </button>
          </div>
        </div>

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
          {grupos.length === 0 ? (
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-12 text-center border border-white/20">
              <p className="text-white text-lg font-medium">📭 No tienes clases programadas para este día</p>
              <p className="text-white/60 text-sm mt-2">Selecciona otra fecha o revisa tu calendario.</p>
            </div>
          ) : (
            grupos.map((grupo) => {
              const grupoKey = grupo.idGrupo;
              const alumnosGrupo = grupo.alumnos;

              return (
                <div
                  key={grupoKey}
                  className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-lg overflow-hidden"
                >
                  {/* Cabecera del grupo */}
                  <div className="p-4 bg-gradient-to-r from-[#26AAA3]/30 to-[#67A934]/30 border-b border-white/10 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        {grupo.nombreCurso}
                        {grupo.esReagendacion && (
                          <span className="text-[10px] bg-[#F8B50E] text-gray-900 px-2 py-0.5 rounded-full font-bold">
                            Reagendada
                          </span>
                        )}
                      </h3>
                      <p className="text-sm text-white/70 flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5" />
                        {grupo.diaClase} {grupo.horaClase} • {grupo.duracionClase}
                        <span className="w-1 h-1 bg-white/30 rounded-full" />
                        <Users className="w-3.5 h-3.5" />
                        {alumnosGrupo.length} alumnos
                      </p>
                    </div>
                    <div className="flex gap-2">
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
                            className="bg-white/5 rounded-xl p-3 border border-white/10 hover:border-white/30 transition-all group"
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
                                {ESTADOS.map((est) => (
                                  <button
                                    key={est.value}
                                    onClick={() => handleEstadoChange(alumno.idAlumno, grupoKey, est.value)}
                                    className={`
                                      w-7 h-7 rounded-full flex items-center justify-center transition-all
                                      ${estadoActual === est.value
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
                            {/* Comentario opcional */}
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
                              className="mt-2 w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white/80 placeholder-white/30 focus:outline-none focus:border-[#26AAA3] transition"
                            />
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
          <span>📋 {grupos.length} grupos · {resumen.total} alumnos</span>
          <span>🔄 {new Date(fecha).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
        </div>
      </div>
    </BackgroundVideo>
  );
}