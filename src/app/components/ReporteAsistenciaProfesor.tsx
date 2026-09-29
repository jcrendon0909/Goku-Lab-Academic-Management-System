import React, { useEffect, useState } from 'react';
import { apiFetch, getProfesores } from '../../services/api';
import { toast } from 'sonner';
import BackgroundVideo from './BackgroundVideo';
import {
  Search,
  RefreshCw,
  User,
  UserCog,
  Download,
  Clock,
  CheckCircle,
  CalendarX,
  Briefcase,
  Ban,
} from 'lucide-react';

// ============================================================
// TIPOS
// ============================================================

interface Sesion {
  _id: string;
  idGrupo: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  duracionClase: string;
  idProfesorTitular: string;
  nombreProfesorTitular: string;
  idProfesorReal: string;
  nombreProfesorReal: string;
  esSustitucion: boolean;
  estado: 'programada' | 'dada' | 'cancelada' | 'no_asistio';
  motivo: string;
  canceladoPor: string;
  totalAlumnos: number;
  totalPresentes: number;
  totalAusentes: number;
  totalReagendados: number;
  observaciones: string;
}

interface Resumen {
  totalSesiones: number;
  dadas: number;
  canceladas: number;
  noAsistio: number;
  horasTrabajadas: number;
  sesiones: Sesion[];
}

interface Profesor {
  idProfesor: string;
  nombre: string;
  tipoPago?: 'por_hora' | 'fijo_mensual';
  salarioPorHora?: number;
  salarioMensual?: number;
}

// ============================================================
// CONSTANTES
// ============================================================

const ESTADO_SESION: Record<
  string,
  { label: string; icon: React.ReactNode; classes: string }
> = {
  programada: {
    label: 'Programada',
    icon: <Clock className="w-4 h-4" />,
    classes: 'bg-white/20 text-white border-white/30',
  },
  dada: {
    label: 'Dada',
    icon: <CheckCircle className="w-4 h-4" />,
    classes: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  },
  cancelada: {
    label: 'Cancelada',
    icon: <Ban className="w-4 h-4" />,
    classes: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
  },
  no_asistio: {
    label: 'No asistió',
    icon: <CalendarX className="w-4 h-4" />,
    classes: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  },
};

// ============================================================
// HELPERS
// ============================================================

/**
 * Parsea la fecha de una sesión sin corrimiento de timezone.
 * El backend la guarda como "2026-09-28T00:00:00.000Z" pero hay que mostrarla
 * como "28 sept 2026", no como "27 sept 2026 18:00".
 */
function parseFechaSesion(fechaRaw: string): Date {
  const fechaStr = String(fechaRaw).split('T')[0]; // "2026-09-28"
  return new Date(fechaStr + 'T12:00:00');
}

// ============================================================
// COMPONENTE
// ============================================================

export function ReporteAsistenciaProfesor() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.rol === 'admin';

  const [profesores, setProfesores] = useState<Profesor[]>([]);
  const [profesorSeleccionado, setProfesorSeleccionado] = useState<string>(
    !isAdmin && user.idProfesor ? user.idProfesor : ''
  );
  const [busquedaProfesor, setBusquedaProfesor] = useState('');
  const [mostrarDropdown, setMostrarDropdown] = useState(false);
  const [cargandoProfesores, setCargandoProfesores] = useState(true);

  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [cargando, setCargando] = useState(false);

  // ============================================================
  // CARGA DE PROFESORES
  // ============================================================

  useEffect(() => {
    const cargar = async () => {
      try {
        setCargandoProfesores(true);
        const data = await getProfesores();
        setProfesores(data);
      } catch (error: any) {
        toast.error(error.message || 'Error al cargar profesores');
      } finally {
        setCargandoProfesores(false);
      }
    };
    cargar();
  }, []);

  const profesoresFiltrados = profesores.filter(
    (p) =>
      p.nombre.toLowerCase().includes(busquedaProfesor.toLowerCase()) ||
      p.idProfesor.toLowerCase().includes(busquedaProfesor.toLowerCase())
  );

  const profesorActual = profesores.find((p) => p.idProfesor === profesorSeleccionado);

  // ============================================================
  // CONSULTA
  // ============================================================

  const cargarResumen = async (overrides?: { desde?: string; hasta?: string }) => {
    if (!profesorSeleccionado) {
      toast.warning('Selecciona un profesor');
      return;
    }

    const d = overrides?.desde ?? fechaDesde;
    const h = overrides?.hasta ?? fechaHasta;

    try {
      setCargando(true);
      const params = new URLSearchParams();
      if (d) params.append('desde', d);
      if (h) params.append('hasta', h);
      const qs = params.toString();
      const url = `/asistencia/reportes/profesor/${profesorSeleccionado}${qs ? `?${qs}` : ''}`;

      const res = await apiFetch(url);
      if (!res.ok) throw new Error('Error al cargar reporte');
      const data: Resumen = await res.json();
      setResumen(data);
    } catch (error: any) {
      toast.error(error.message || 'Error al cargar reporte');
    } finally {
      setCargando(false);
    }
  };

  // ============================================================
  // PRESETS DE FECHA (consultan solos)
  // ============================================================

  const aplicarPreset = (preset: 'semana' | 'mes' | 'mesPasado') => {
    const hoy = new Date();
    const y = hoy.getFullYear();
    const m = hoy.getMonth();
    let desde = '';
    let hasta = '';

    if (preset === 'semana') {
      const lunes = new Date(hoy);
      const dow = hoy.getDay() === 0 ? 6 : hoy.getDay() - 1;
      lunes.setDate(hoy.getDate() - dow);
      const domingo = new Date(lunes);
      domingo.setDate(lunes.getDate() + 6);
      desde = lunes.toLocaleDateString('en-CA');
      hasta = domingo.toLocaleDateString('en-CA');
    } else if (preset === 'mes') {
      const primero = new Date(y, m, 1);
      const ultimo = new Date(y, m + 1, 0);
      desde = primero.toLocaleDateString('en-CA');
      hasta = ultimo.toLocaleDateString('en-CA');
    } else if (preset === 'mesPasado') {
      const primero = new Date(y, m - 1, 1);
      const ultimo = new Date(y, m, 0);
      desde = primero.toLocaleDateString('en-CA');
      hasta = ultimo.toLocaleDateString('en-CA');
    }

    setFechaDesde(desde);
    setFechaHasta(hasta);

    // Consultar automáticamente con las nuevas fechas
    cargarResumen({ desde, hasta });
  };

  // ============================================================
  // EXPORTAR CSV
  // ============================================================

  const exportarCSV = () => {
    if (!resumen || resumen.sesiones.length === 0) {
      toast.warning('No hay datos para exportar');
      return;
    }
    const headers = [
      'Fecha',
      'Grupo',
      'Hora inicio',
      'Hora fin',
      'Estado',
      'Profesor real',
      'Sustituto',
      'Alumnos',
      'Presentes',
      'Ausentes',
      'Motivo',
    ];
    const rows = resumen.sesiones.map((s) => [
      parseFechaSesion(s.fecha).toLocaleDateString('es-ES'),
      s.idGrupo,
      s.horaInicio,
      s.horaFin,
      ESTADO_SESION[s.estado]?.label || s.estado,
      s.nombreProfesorReal,
      s.esSustitucion ? 'Sí' : 'No',
      s.totalAlumnos,
      s.totalPresentes,
      s.totalAusentes,
      (s.motivo || '').replace(/,/g, ';'),
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `AsistenciaProfesor_${profesorSeleccionado}.csv`;
    link.click();
    toast.success('Exportado correctamente');
  };

  const limpiar = () => {
    setFechaDesde('');
    setFechaHasta('');
    setResumen(null);
    if (isAdmin) {
      setProfesorSeleccionado('');
      setBusquedaProfesor('');
    }
  };

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
              <Briefcase className="h-6 w-6 text-white" />
            </span>
            <span className="bg-gradient-to-r from-[#26AAA3] via-[#67A934] to-[#F8B50E] text-transparent bg-clip-text">
              Reporte de Asistencia por Profesor
            </span>
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => cargarResumen()}
              disabled={!profesorSeleccionado || cargando}
              className="bg-gradient-to-r from-[#26AAA3] to-[#67A934] text-white px-4 py-2 rounded-full font-bold hover:scale-105 transition-all shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 ${cargando ? 'animate-spin' : ''}`} />
              Consultar
            </button>
            <button
              onClick={exportarCSV}
              disabled={!resumen || resumen.sesiones.length === 0}
              className="bg-gradient-to-r from-[#F8B50E] to-[#FFD700] text-gray-900 px-4 py-2 rounded-full font-bold hover:scale-105 transition-all shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              Exportar
            </button>
            <button
              onClick={limpiar}
              className="bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-full font-medium hover:bg-white/30 transition-all border border-white/20"
            >
              Limpiar
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white/20 backdrop-blur-md rounded-2xl p-4 mb-4 border border-white/20 flex flex-wrap items-start gap-3 flex-shrink-0">
          {isAdmin && (
            <div className="flex-1 min-w-[240px] relative">
              <label className="block text-xs text-white/80 font-medium mb-1">Buscar profesor</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/50" />
                <input
                  type="text"
                  placeholder="Nombre o ID..."
                  value={busquedaProfesor}
                  onChange={(e) => {
                    setBusquedaProfesor(e.target.value);
                    setMostrarDropdown(true);
                  }}
                  onFocus={() => setMostrarDropdown(true)}
                  className="w-full bg-white/10 border border-white/20 rounded-xl pl-10 pr-4 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#26AAA3]"
                />
              </div>
              {mostrarDropdown && busquedaProfesor && profesoresFiltrados.length > 0 && (
                <div className="absolute z-20 mt-1 w-full bg-gray-900/95 backdrop-blur-md rounded-xl border border-white/20 shadow-xl max-h-60 overflow-y-auto">
                  {profesoresFiltrados.slice(0, 15).map((p) => (
                    <button
                      key={p.idProfesor}
                      onClick={() => {
                        setProfesorSeleccionado(p.idProfesor);
                        setBusquedaProfesor(`${p.idProfesor} - ${p.nombre}`);
                        setMostrarDropdown(false);
                        setResumen(null);
                      }}
                      className="w-full text-left px-4 py-2 text-white hover:bg-white/10 transition-colors text-sm"
                    >
                      <span className="font-mono text-[#F8B50E] mr-2">{p.idProfesor}</span>
                      {p.nombre}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

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

          {/* Presets */}
          <div className="self-end flex gap-1">
            <button
              onClick={() => aplicarPreset('semana')}
              className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-xl border border-white/20 transition"
              title="Lunes a domingo de esta semana"
            >
              Esta semana
            </button>
            <button
              onClick={() => aplicarPreset('mes')}
              className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-xl border border-white/20 transition"
            >
              Este mes
            </button>
            <button
              onClick={() => aplicarPreset('mesPasado')}
              className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-xl border border-white/20 transition"
            >
              Mes pasado
            </button>
          </div>

          {profesorActual && (
            <div className="min-w-[220px] self-end">
              <div className="bg-white/10 px-4 py-2 rounded-xl border border-white/20 text-white text-sm">
                <span className="flex items-center gap-2">
                  <User className="w-4 h-4 text-[#26AAA3]" />
                  <span className="truncate">{profesorActual.nombre}</span>
                  {profesorActual.tipoPago && (
                    <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full uppercase">
                      {profesorActual.tipoPago === 'por_hora' ? 'Por hora' : 'Fijo'}
                    </span>
                  )}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Estado vacío */}
        {isAdmin && !profesorSeleccionado && !cargando && (
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-12 text-center border border-white/20">
            <UserCog className="w-16 h-16 text-white/40 mx-auto mb-4" />
            <p className="text-white text-lg font-medium">Selecciona un profesor para comenzar</p>
            <p className="text-white/60 text-sm mt-2">Busca por nombre o ID arriba.</p>
          </div>
        )}

        {/* Tarjetas de resumen */}
        {resumen && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 mb-4 flex-shrink-0">
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 text-center border border-white/30">
              <p className="text-[10px] uppercase tracking-wide text-white/70">Total sesiones</p>
              <p className="text-2xl font-bold text-white">{resumen.totalSesiones}</p>
            </div>
            <div className="bg-emerald-500/20 backdrop-blur-sm rounded-xl p-3 text-center border border-emerald-500/40">
              <p className="text-[10px] uppercase tracking-wide text-emerald-200">Dadas</p>
              <p className="text-2xl font-bold text-emerald-300">{resumen.dadas}</p>
            </div>
            <div className="bg-rose-500/20 backdrop-blur-sm rounded-xl p-3 text-center border border-rose-500/40">
              <p className="text-[10px] uppercase tracking-wide text-rose-200">Canceladas</p>
              <p className="text-2xl font-bold text-rose-300">{resumen.canceladas}</p>
            </div>
            <div className="bg-amber-500/20 backdrop-blur-sm rounded-xl p-3 text-center border border-amber-500/40">
              <p className="text-[10px] uppercase tracking-wide text-amber-200">No asistió</p>
              <p className="text-2xl font-bold text-amber-300">{resumen.noAsistio}</p>
            </div>
            <div className="bg-blue-500/20 backdrop-blur-sm rounded-xl p-3 text-center border border-blue-500/40 col-span-2 md:col-span-1">
              <p className="text-[10px] uppercase tracking-wide text-blue-200">Horas trabajadas</p>
              <p className="text-2xl font-bold text-blue-300">{resumen.horasTrabajadas}</p>
            </div>
          </div>
        )}

        {/* Listado de sesiones */}
        {resumen && (
          <div className="flex-1 overflow-y-auto pb-4 min-h-0 space-y-2">
            {resumen.sesiones.length === 0 ? (
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-12 text-center border border-white/20">
                <p className="text-white text-lg font-medium">📭 No hay sesiones en este rango</p>
                <p className="text-white/60 text-sm mt-2">Prueba con otras fechas.</p>
              </div>
            ) : (
              resumen.sesiones.map((s) => {
                const info = ESTADO_SESION[s.estado] || ESTADO_SESION.programada;
                const fecha = parseFechaSesion(s.fecha);
                return (
                  <div
                    key={s._id}
                    className={`bg-white/10 backdrop-blur-md rounded-2xl border overflow-hidden ${
                      s.estado === 'dada'
                        ? 'border-emerald-500/20'
                        : s.estado === 'cancelada'
                        ? 'border-rose-500/20'
                        : s.estado === 'no_asistio'
                        ? 'border-amber-500/20'
                        : 'border-white/20'
                    }`}
                  >
                    <div className="p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3 flex-wrap flex-1 min-w-0">
                          <div className="flex flex-col">
                            <span className="text-white font-bold text-lg">
                              {fecha.toLocaleDateString('es-ES', {
                                weekday: 'short',
                                day: 'numeric',
                                month: 'short',
                              })}
                            </span>
                            <span className="text-white/50 text-xs">{fecha.getFullYear()}</span>
                          </div>

                          <div className="h-10 w-px bg-white/20" />

                          <div className="min-w-0">
                            <p className="text-white font-medium flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-xs text-[#26AAA3]">{s.idGrupo}</span>
                              {s.esSustitucion && (
                                <span className="text-[10px] bg-blue-500/80 text-white px-2 py-0.5 rounded-full font-bold">
                                  Sustituto
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-white/60 flex items-center gap-2 mt-0.5 flex-wrap">
                              <Clock className="w-3 h-3" />
                              {s.horaInicio} {s.horaFin ? `- ${s.horaFin}` : ''}
                              {s.duracionClase && (
                                <>
                                  <span className="w-1 h-1 bg-white/30 rounded-full" />
                                  {s.duracionClase}
                                </>
                              )}
                              {s.totalAlumnos > 0 && (
                                <>
                                  <span className="w-1 h-1 bg-white/30 rounded-full" />
                                  <User className="w-3 h-3" />
                                  {s.totalPresentes}/{s.totalAlumnos} presentes
                                </>
                              )}
                            </p>
                            {s.motivo && (
                              <p className="text-xs text-white/50 mt-1 italic">
                                {s.motivo}
                              </p>
                            )}
                          </div>
                        </div>

                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${info.classes}`}
                        >
                          {info.icon}
                          {info.label}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Pie */}
        <div className="mt-2 flex justify-between items-center text-xs text-white/50 flex-shrink-0">
          <span>📋 {resumen ? `${resumen.sesiones.length} sesiones` : 'Sin datos'}</span>
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