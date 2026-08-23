import React, { useEffect, useState } from 'react';
import { apiFetch } from '../../services/api';
import { toast } from 'sonner';
import BackgroundVideo from './BackgroundVideo';
import {
  Calendar as CalendarIcon,
  Search,
  RefreshCw,
  User,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Download,
  Filter,
} from 'lucide-react';

interface Asistencia {
  _id: string;
  idAlumno: string;
  idGrupo: string;
  idProfesor: string;
  fecha: string;
  estado: 'presente' | 'ausente' | 'justificado' | 'retardo';
  comentario: string;
  horaInicio?: string;
  horaFin?: string;
  createdAt: string;
  updatedAt: string;
}

interface Alumno {
  idAlumno: string;
  nombreAlumno: string;
}

const ESTADO_LABELS = {
  presente: { label: 'Presente', icon: <CheckCircle className="w-4 h-4 text-emerald-400" />, color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  ausente: { label: 'Ausente', icon: <XCircle className="w-4 h-4 text-rose-400" />, color: 'bg-rose-500/20 text-rose-400 border-rose-500/30' },
  justificado: { label: 'Justificado', icon: <AlertCircle className="w-4 h-4 text-amber-400" />, color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  retardo: { label: 'Retardo', icon: <Clock className="w-4 h-4 text-blue-400" />, color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
};

export function ReporteAsistenciaAlumno() {
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [alumnoSeleccionado, setAlumnoSeleccionado] = useState('');
  const [asistencias, setAsistencias] = useState<Asistencia[]>([]);
  const [cargando, setCargando] = useState(false);
  const [cargandoAlumnos, setCargandoAlumnos] = useState(true);
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [busquedaAlumno, setBusquedaAlumno] = useState('');

  // Cargar lista de alumnos
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

  // Filtrar alumnos por búsqueda
  const alumnosFiltrados = alumnos.filter(a =>
    a.nombreAlumno.toLowerCase().includes(busquedaAlumno.toLowerCase()) ||
    a.idAlumno.toLowerCase().includes(busquedaAlumno.toLowerCase())
  );

  // Cargar asistencias del alumno seleccionado
  const cargarAsistencias = async () => {
    if (!alumnoSeleccionado) {
      toast.warning('Selecciona un alumno');
      return;
    }
    try {
      setCargando(true);
      let url = `/asistencia/alumno/${alumnoSeleccionado}`;
      const params = new URLSearchParams();
      if (fechaDesde) params.append('desde', fechaDesde);
      if (fechaHasta) params.append('hasta', fechaHasta);
      if (params.toString()) url += `?${params.toString()}`;
      const res = await apiFetch(url);
      if (!res.ok) throw new Error('Error al cargar asistencias');
      const data = await res.json();
      setAsistencias(data);
    } catch (error: any) {
      toast.error(error.message || 'Error al cargar asistencias');
    } finally {
      setCargando(false);
    }
  };

  // Exportar a Excel (simple CSV)
  const exportarCSV = () => {
    if (asistencias.length === 0) {
      toast.warning('No hay datos para exportar');
      return;
    }
    const headers = ['Fecha', 'Grupo', 'Profesor', 'Estado', 'Comentario'];
    const rows = asistencias.map(a => [
      new Date(a.fecha).toLocaleDateString('es-ES'),
      a.idGrupo,
      a.idProfesor,
      ESTADO_LABELS[a.estado]?.label || a.estado,
      a.comentario || '',
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
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
    setAsistencias([]);
  };

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
              <User className="h-6 w-6 text-white" />
            </span>
            <span className="bg-gradient-to-r from-[#26AAA3] via-[#67A934] to-[#F8B50E] text-transparent bg-clip-text">
              Reporte de Asistencia por Alumno
            </span>
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={cargarAsistencias}
              disabled={!alumnoSeleccionado}
              className="bg-gradient-to-r from-[#26AAA3] to-[#67A934] text-white px-4 py-2 rounded-full font-bold hover:scale-105 transition-all shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className="w-4 h-4" />
              Consultar
            </button>
            <button
              onClick={exportarCSV}
              disabled={asistencias.length === 0}
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
        <div className="bg-white/20 backdrop-blur-md rounded-2xl p-4 mb-4 border border-white/20 flex flex-wrap items-center gap-3 flex-shrink-0">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs text-white/80 font-medium mb-1">Buscar alumno</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/50" />
              <input
                type="text"
                placeholder="Nombre o ID..."
                value={busquedaAlumno}
                onChange={(e) => setBusquedaAlumno(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-xl pl-10 pr-4 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#26AAA3]"
              />
            </div>
            {busquedaAlumno && alumnosFiltrados.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-gray-900/95 backdrop-blur-md rounded-xl border border-white/20 shadow-xl max-h-48 overflow-y-auto">
                {alumnosFiltrados.slice(0, 10).map(a => (
                  <button
                    key={a.idAlumno}
                    onClick={() => {
                      setAlumnoSeleccionado(a.idAlumno);
                      setBusquedaAlumno(`${a.idAlumno} - ${a.nombreAlumno}`);
                      setAsistencias([]);
                    }}
                    className="w-full text-left px-4 py-2 text-white hover:bg-white/10 transition-colors text-sm"
                  >
                    {a.idAlumno} - {a.nombreAlumno}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="block text-xs text-white/80 font-medium mb-1">Desde</label>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#26AAA3]"
            />
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="block text-xs text-white/80 font-medium mb-1">Hasta</label>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#26AAA3]"
            />
          </div>
          <div className="flex-shrink-0">
            <label className="block text-xs text-white/80 font-medium mb-1 invisible">Alumno seleccionado</label>
            <div className="bg-white/10 px-4 py-2 rounded-xl border border-white/20 text-white text-sm">
              {alumnoSeleccionado ? (
                <span className="flex items-center gap-2">
                  <User className="w-4 h-4 text-[#26AAA3]" />
                  {alumnos.find(a => a.idAlumno === alumnoSeleccionado)?.nombreAlumno || alumnoSeleccionado}
                </span>
              ) : (
                <span className="text-white/50">Ninguno seleccionado</span>
              )}
            </div>
          </div>
        </div>

        {/* Tabla de asistencias */}
        <div className="bg-white/20 backdrop-blur-md rounded-2xl overflow-hidden border border-white/20 shadow-xl flex-1 flex flex-col min-h-0">
          <div className="overflow-x-auto overflow-y-auto flex-1">
            <table className="w-full table-auto divide-y divide-white/10 text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="bg-gradient-to-r from-[#26AAA3] to-[#67A934] text-white">
                  <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider">Fecha</th>
                  <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider">Grupo</th>
                  <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider">Profesor</th>
                  <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider">Estado</th>
                  <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider">Comentario</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {cargando ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-white/60">
                      <div className="flex justify-center items-center gap-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white"></div>
                        Cargando...
                      </div>
                    </td>
                  </tr>
                ) : asistencias.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-white/60 italic">
                      {alumnoSeleccionado ? 'No hay asistencias registradas para este alumno.' : 'Selecciona un alumno para ver su historial.'}
                    </td>
                  </tr>
                ) : (
                  asistencias.map((a) => {
                    const estadoInfo = ESTADO_LABELS[a.estado] || ESTADO_LABELS.ausente;
                    return (
                      <tr key={a._id} className="hover:bg-white/10 transition-colors">
                        <td className="px-3 py-2 whitespace-nowrap text-white/80">
                          {new Date(a.fecha).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap font-mono text-white/80">{a.idGrupo}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-white/80">{a.idProfesor}</td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${estadoInfo.color}`}>
                            {estadoInfo.icon}
                            {estadoInfo.label}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-white/60 max-w-xs truncate" title={a.comentario}>
                          {a.comentario || '-'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pie de página */}
        <div className="mt-2 flex justify-between items-center text-xs text-white/50 flex-shrink-0">
          <span>📋 {asistencias.length} registros</span>
          <span>🔄 {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
        </div>
      </div>
    </BackgroundVideo>
  );
}