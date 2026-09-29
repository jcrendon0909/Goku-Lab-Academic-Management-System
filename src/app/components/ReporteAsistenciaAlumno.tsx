import React, { useEffect, useState } from 'react';
import { apiFetch } from '../../services/api';
import { toast } from 'sonner';
import BackgroundVideo from './BackgroundVideo';
import {
  Search,
  RefreshCw,
  User,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Download,
  Repeat,
  Calendar,
  UserCog,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

// ============================================================
// TIPOS
// ============================================================

interface Reagendacion {
  ReagendacionId: string;
  fechaHoraOriginal: string | null;
  fechaHoraNueva: string | null;
  idGrupoOrigen: string;
  idGrupoNuevo: string;
  nombreCurso: string;
  motivo: string;
  comentario: string;
  tipoReagendacion: 'temporal' | 'permanente';
  estatus: string;
}

interface TimelineItem {
  fecha: string;
  idGrupo: string;
  idGrupoRegular: string;
  tipoRegistro: 'regular' | 'reagendacion';
  estado: 'presente' | 'ausente' | 'justificado' | 'retardo' | 'reagendado' | 'pendiente';
  comentario: string;
  horaInicio: string;
  horaFin: string;
  estadoSesion: 'programada' | 'dada' | 'cancelada' | 'no_asistio' | 'desconocido';
  profesorReal: string;
  esSustitucion: boolean;
  reagendacion: Reagendacion | null;
}

interface Totales {
  total: number;
  presentes: number;
  ausentes: number;
  justificados: number;
  retardos: number;
  reagendados: number;
}

interface Alumno {
  idAlumno: string;
  nombreAlumno: string;
}

// ============================================================
// CONSTANTES
// ============================================================

const ESTADO_ALUMNO: Record<
  string,
  { label: string; icon: React.ReactNode; color: string }
> = {
  presente: {
    label: 'Presente',
    icon: <CheckCircle className="w-4 h-4" />,
    color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  },
  ausente: {
    label: 'Ausente',
    icon: <XCircle className="w-4 h-4" />,
    color: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
  },
  justificado: {
    label: 'Justificado',
    icon: <AlertCircle className="w-4 h-4" />,
    color: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  },
  retardo: {
    label: 'Retardo',
    icon: <Clock className="w-4 h-4" />,
    color: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  },
  reagendado: {
    label: 'Reagendado',
    icon: <Repeat className="w-4 h-4" />,
    color: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
  },
  pendiente: {
    label: 'Pendiente',
    icon: <Clock className="w-4 h-4" />,
    color: 'bg-white/10 text-white/70 border-white/30',
  },
};

const ESTADO_SESION: Record<string, { label: string; classes: string }> = {
  programada: { label: 'Programada', classes: 'bg-white/20 text-white' },
  dada: { label: 'Clase dada', classes: 'bg-emerald-500/80 text-white' },
  cancelada: { label: 'Cancelada', classes: 'bg-rose-500/80 text-white' },
  no_asistio: { label: 'No asistió', classes: 'bg-amber-500/80 text-gray-900' },
  desconocido: { label: 'Sin sesión', classes: 'bg-white/10 text-white/60' },
};

const TARJETA_TOTALES: {
  key: keyof Totales;
  label: string;
  classes: string;
  ring: string;
}[] = [
  { key: 'total', label: 'Total', classes: 'bg-white/20 text-white', ring: 'border-white/30' },
  { key: 'presentes', label: 'Presentes', classes: 'bg-emerald-500/20 text-emerald-300', ring: 'border-emerald-500/40' },
  { key: 'ausentes', label: 'Ausentes', classes: 'bg-rose-500/20 text-rose-300', ring: 'border-rose-500/40' },
  { key: 'justificados', label: 'Justificados', classes: 'bg-amber-500/20 text-amber-300', ring: 'border-amber-500/40' },
  { key: 'retardos', label: 'Retardos', classes: 'bg-blue-500/20 text-blue-300', ring: 'border-blue-500/40' },
  { key: 'reagendados', label: 'Reagendados', classes: 'bg-purple-500/20 text-purple-300', ring: 'border-purple-500/40' },
];

// ============================================================
// COMPONENTE
// ============================================================

export function ReporteAsistenciaAlumno() {
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [alumnoSeleccionado, setAlumnoSeleccionado] = useState('');
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [totales, setTotales] = useState<Totales | null>(null);
  const [cargando, setCargando] = useState(false);
  const [cargandoAlumnos, setCargandoAlumnos] = useState(true);
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [busquedaAlumno, setBusquedaAlumno] = useState('');
  const [mostrarDropdown, setMostrarDropdown] = useState(false);
  const [expandidos, setExpandidos] = useState<Record<string, boolean>>({});

  // ============================================================
  // CARGA DE ALUMNOS
  // ============================================================

  useEffect(() => {
    const cargarAlumnos = async () => {
      try {
        setCargandoAlumnos(true);
        const res = await apiFetch('/alumnos');
        if (!res.ok) throw new Error('Error al cargar alumnos');
        const data = await res.json();
        setAlumnos(data);
      } catch (error: any) {
        toast.error(error.message || 'Error al cargar alumnos');
      } finally {
        setCargandoAlumnos(false);
      }
    };
    cargarAlumnos();
  }, []);

  const alumnosFiltrados = alumnos.filter(
    (a) =>
      a.nombreAlumno.toLowerCase().includes(busquedaAlumno.toLowerCase()) ||
      a.idAlumno.toLowerCase().includes(busquedaAlumno.toLowerCase())
  );

  // ============================================================
  // CONSULTA
  // ============================================================

  const cargarTimeline = async () => {
    if (!alumnoSeleccionado) {
      toast.warning('Selecciona un alumno');
      return;
    }
    try {
      setCargando(true);
      const params = new URLSearchParams();
      if (fechaDesde) params.append('desde', fechaDesde);
      if (fechaHasta) params.append('hasta', fechaHasta);
      const qs = params.toString();
      const url = `/asistencia/reportes/alumno/${alumnoSeleccionado}${qs ? `?${qs}` : ''}`;

      const res = await apiFetch(url);
      if (!res.ok) throw new Error('Error al cargar asistencias');
      const data = await res.json();
      setTimeline(data.timeline || []);
      setTotales(data.totales || null);
      setExpandidos({});
    } catch (error: any) {
      toast.error(error.message || 'Error al cargar asistencias');
    } finally {
      setCargando(false);
    }
  };

  // ============================================================
  // EXPORTAR CSV
  // ============================================================

  const exportarCSV = () => {
    if (timeline.length === 0) {
      toast.warning('No hay datos para exportar');
      return;
    }
    const headers = [
      'Fecha',
      'Grupo',
      'Grupo regular',
      'Tipo',
      'Estado',
      'Estado clase',
      'Profesor',
      'Sustituto',
      'Hora inicio',
      'Hora fin',
      'Comentario',
    ];
    const rows = timeline.map((a) => [
      new Date(a.fecha + 'T12:00:00').toLocaleDateString('es-ES'),
      a.idGrupo,
      a.idGrupoRegular,
      a.tipoRegistro,
      ESTADO_ALUMNO[a.estado]?.label || a.estado,
      ESTADO_SESION[a.estadoSesion]?.label || a.estadoSesion,
      a.profesorReal,
      a.esSustitucion ? 'Sí' : 'No',
      a.horaInicio,
      a.horaFin,
      (a.comentario || '').replace(/,/g, ';'),
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Asistencias_${alumnoSeleccionado}.csv`;
    link.click();
    toast.success('Exportado correctamente');
  };

  const limpiarFiltros = () => {
    setFechaDesde('');
    setFechaHasta('');
    setBusquedaAlumno('');
    setAlumnoSeleccionado('');
    setTimeline([]);
    setTotales(null);
    setExpandidos({});
  };

  const toggleExpandido = (key: string) => {
    setExpandidos((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const alumnoActual = alumnos.find((a) => a.idAlumno === alumnoSeleccionado);

  const decorativeVideos: { src: string; position: any }[] = [];

  // ============================================================
  // RENDER
  // ============================================================

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
              <User className="h-6 w-6 text-white" />
            </span>
            <span className="bg-gradient-to-r from-[#26AAA3] via-[#67A934] to-[#F8B50E] text-transparent bg-clip-text">
              Reporte de Asistencia por Alumno
            </span>
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={cargarTimeline}
              disabled={!alumnoSeleccionado || cargando}
              className="bg-gradient-to-r from-[#26AAA3] to-[#67A934] text-white px-4 py-2 rounded-full font-bold hover:scale-105 transition-all shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 ${cargando ? 'animate-spin' : ''}`} />
              Consultar
            </button>
            <button
              onClick={exportarCSV}
              disabled={timeline.length === 0}
              className="bg-gradient-to-r from-[#F8B50E] to-[#FFD700] text-gray-900 px-4 py-2 rounded-full font-bold hover:scale-105 transition-all shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              Exportar
            </button>
            <button
              onClick={limpiarFiltros}
              className="bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-full font-medium hover:bg-white/30 transition-all border border-white/20"
            >
              Limpiar
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white/20 backdrop-blur-md rounded-2xl p-4 mb-4 border border-white/20 flex flex-wrap items-start gap-3 flex-shrink-0">
          <div className="flex-1 min-w-[240px] relative">
            <label className="block text-xs text-white/80 font-medium mb-1">Buscar alumno</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/50" />
              <input
                type="text"
                placeholder="Nombre o ID..."
                value={busquedaAlumno}
                onChange={(e) => {
                  setBusquedaAlumno(e.target.value);
                  setMostrarDropdown(true);
                }}
                onFocus={() => setMostrarDropdown(true)}
                className="w-full bg-white/10 border border-white/20 rounded-xl pl-10 pr-4 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#26AAA3]"
              />
            </div>
            {mostrarDropdown && busquedaAlumno && alumnosFiltrados.length > 0 && (
              <div className="absolute z-20 mt-1 w-full bg-gray-900/95 backdrop-blur-md rounded-xl border border-white/20 shadow-xl max-h-60 overflow-y-auto">
                {alumnosFiltrados.slice(0, 15).map((a) => (
                  <button
                    key={a.idAlumno}
                    onClick={() => {
                      setAlumnoSeleccionado(a.idAlumno);
                      setBusquedaAlumno(`${a.idAlumno} - ${a.nombreAlumno}`);
                      setMostrarDropdown(false);
                      setTimeline([]);
                      setTotales(null);
                    }}
                    className="w-full text-left px-4 py-2 text-white hover:bg-white/10 transition-colors text-sm"
                  >
                    <span className="font-mono text-[#F8B50E] mr-2">{a.idAlumno}</span>
                    {a.nombreAlumno}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="min-w-[140px]">
            <label className="block text-xs text-white/80 font-medium mb-1">Desde</label>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#26AAA3]"
            />
          </div>
          <div className="min-w-[140px]">
            <label className="block text-xs text-white/80 font-medium mb-1">Hasta</label>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#26AAA3]"
            />
          </div>

          <div className="min-w-[200px] self-end">
            <div className="bg-white/10 px-4 py-2 rounded-xl border border-white/20 text-white text-sm">
              {alumnoActual ? (
                <span className="flex items-center gap-2">
                  <User className="w-4 h-4 text-[#26AAA3]" />
                  {alumnoActual.nombreAlumno}
                </span>
              ) : (
                <span className="text-white/50">Ninguno seleccionado</span>
              )}
            </div>
          </div>
        </div>

        {/* Tarjetas de totales */}
        {totales && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 mb-4 flex-shrink-0">
            {TARJETA_TOTALES.map((t) => (
              <div
                key={t.key}
                className={`${t.classes} ${t.ring} backdrop-blur-sm rounded-xl p-3 text-center border`}
              >
                <p className="text-[10px] uppercase tracking-wide opacity-80">{t.label}</p>
                <p className="text-2xl font-bold">{totales[t.key]}</p>
              </div>
            ))}
          </div>
        )}

        {/* Timeline */}
        <div className="flex-1 overflow-y-auto pb-4 min-h-0">
          {cargando ? (
            <div className="flex items-center justify-center h-32">
              <RefreshCw className="w-8 h-8 text-white animate-spin" />
            </div>
          ) : !alumnoSeleccionado ? (
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-12 text-center border border-white/20">
              <User className="w-16 h-16 text-white/30 mx-auto mb-4" />
              <p className="text-white text-lg font-medium">Selecciona un alumno para ver su historial</p>
              <p className="text-white/60 text-sm mt-2">Busca por nombre o ID arriba.</p>
            </div>
          ) : timeline.length === 0 ? (
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-12 text-center border border-white/20">
              <p className="text-white text-lg font-medium">📭 No hay asistencias registradas</p>
              <p className="text-white/60 text-sm mt-2">Prueba con otro rango de fechas.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {timeline.map((a, idx) => {
                const estadoInfo = ESTADO_ALUMNO[a.estado] || ESTADO_ALUMNO.ausente;
                const sesionInfo = ESTADO_SESION[a.estadoSesion] || ESTADO_SESION.desconocido;
                const key = `${a.fecha}-${a.idGrupo}-${idx}`;
                const expandido = expandidos[key];
                const esReagendacion = a.tipoRegistro === 'reagendacion';

                return (
                  <div
                    key={key}
                    className={`bg-white/10 backdrop-blur-md rounded-2xl border overflow-hidden transition-all ${
                      esReagendacion ? 'border-purple-500/30' : 'border-white/20'
                    }`}
                  >
                    <div className="p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3 flex-wrap flex-1 min-w-0">
                          <div className="flex flex-col">
                            <span className="text-white font-bold text-lg">
                              {new Date(a.fecha + 'T12:00:00').toLocaleDateString('es-ES', {
                                weekday: 'short',
                                day: 'numeric',
                                month: 'short',
                              })}
                            </span>
                            <span className="text-white/50 text-xs">
                              {new Date(a.fecha + 'T12:00:00').getFullYear()}
                            </span>
                          </div>

                          <div className="h-10 w-px bg-white/20" />

                          <div className="min-w-0">
                            <p className="text-white font-medium flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-xs text-[#26AAA3]">{a.idGrupo}</span>
                              {esReagendacion && (
                                <span className="text-[10px] bg-purple-500/80 text-white px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                                  <Repeat className="w-3 h-3" /> Reagendación
                                </span>
                              )}
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${sesionInfo.classes}`}
                              >
                                {sesionInfo.label}
                              </span>
                            </p>
                            <p className="text-xs text-white/60 flex items-center gap-2 mt-0.5">
                              <Clock className="w-3 h-3" />
                              {a.horaInicio} {a.horaFin ? `- ${a.horaFin}` : ''}
                              {a.profesorReal && (
                                <>
                                  <span className="w-1 h-1 bg-white/30 rounded-full" />
                                  <User className="w-3 h-3" />
                                  {a.profesorReal}
                                  {a.esSustitucion && (
                                    <span className="text-[10px] bg-blue-500/60 text-white px-1.5 py-0.5 rounded-full">
                                      Sustituto
                                    </span>
                                  )}
                                </>
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${estadoInfo.color}`}
                          >
                            {estadoInfo.icon}
                            {estadoInfo.label}
                          </span>
                          {(a.comentario || a.reagendacion) && (
                            <button
                              onClick={() => toggleExpandido(key)}
                              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/80 transition"
                              title={expandido ? 'Cerrar' : 'Ver detalles'}
                            >
                              {expandido ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Detalles expandidos */}
                      {expandido && (
                        <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
                          {a.comentario && (
                            <div className="flex items-start gap-2 text-sm text-white/80">
                              <span className="text-white/50 font-medium flex-shrink-0">Comentario:</span>
                              <span className="italic">{a.comentario}</span>
                            </div>
                          )}
                          {a.reagendacion && (
                            <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-3 text-sm">
                              <p className="text-purple-300 font-bold mb-1 flex items-center gap-1.5">
                                <Repeat className="w-3.5 h-3.5" /> Detalle de reagendación
                              </p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-white/80">
                                <div>
                                  <span className="text-white/50">Origen:</span>{' '}
                                  <span className="font-mono">{a.reagendacion.idGrupoOrigen}</span>
                                  {a.reagendacion.fechaHoraOriginal && (
                                    <>
                                      {' · '}
                                      {new Date(a.reagendacion.fechaHoraOriginal).toLocaleString('es-ES', {
                                        day: 'numeric',
                                        month: 'short',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}
                                    </>
                                  )}
                                </div>
                                <div>
                                  <span className="text-white/50">Destino:</span>{' '}
                                  <span className="font-mono">{a.reagendacion.idGrupoNuevo}</span>
                                  {a.reagendacion.fechaHoraNueva && (
                                    <>
                                      {' · '}
                                      {new Date(a.reagendacion.fechaHoraNueva).toLocaleString('es-ES', {
                                        day: 'numeric',
                                        month: 'short',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}
                                    </>
                                  )}
                                </div>
                                <div className="sm:col-span-2">
                                  <span className="text-white/50">Tipo:</span>{' '}
                                  <span className="capitalize">{a.reagendacion.tipoReagendacion}</span>
                                </div>
                                {a.reagendacion.comentario && (
                                  <div className="sm:col-span-2">
                                    <span className="text-white/50">Nota:</span>{' '}
                                    <span className="italic">{a.reagendacion.comentario}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pie */}
        <div className="mt-2 flex justify-between items-center text-xs text-white/50 flex-shrink-0">
          <span>📋 {timeline.length} registros</span>
          <span>
            🔄{' '}
            {new Date().toLocaleDateString('es-ES', {
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