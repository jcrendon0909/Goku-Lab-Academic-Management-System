import React, { useEffect, useState } from 'react';
import { apiFetch } from '../../services/api';
import { toast } from 'sonner';
import BackgroundVideo from './BackgroundVideo';
import {
  Calendar,
  User,
  Search,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Download,
  Filter,
  Users,
} from 'lucide-react';

interface Asistencia {
  _id: string;
  idAlumno: string;
  idGrupo: string;
  idProfesor: string;
  fecha: string;
  estado: 'presente' | 'ausente' | 'justificado' | 'retardo';
  comentario: string;
}

interface Alumno {
  idAlumno: string;
  nombreAlumno: string;
}

interface GrupoAsistencia {
  idGrupo: string;
  nombreCurso: string;
  diaClase: string;
  horaClase: string;
  alumnos: {
    idAlumno: string;
    nombreAlumno: string;
    estadoAsistencia: string;
    comentarioAsistencia: string;
  }[];
}

const ESTADO_LABELS = {
  presente: { label: 'Presente', icon: <CheckCircle className="w-4 h-4" />, color: 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30' },
  ausente: { label: 'Ausente', icon: <XCircle className="w-4 h-4" />, color: 'text-rose-400 bg-rose-500/20 border-rose-500/30' },
  justificado: { label: 'Justificado', icon: <AlertCircle className="w-4 h-4" />, color: 'text-amber-400 bg-amber-500/20 border-amber-500/30' },
  retardo: { label: 'Retardo', icon: <Clock className="w-4 h-4" />, color: 'text-blue-400 bg-blue-500/20 border-blue-500/30' },
};

export function ConsultaAsistencias() {
  const [tab, setTab] = useState<'fecha' | 'alumno'>('fecha');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.rol === 'admin';

  // Estado para pestaña "Por fecha"
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [profesorSeleccionado, setProfesorSeleccionado] = useState('');
  const [gruposFecha, setGruposFecha] = useState<GrupoAsistencia[]>([]);
  const [cargandoFecha, setCargandoFecha] = useState(false);

  // Estado para pestaña "Por alumno"
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [busquedaAlumno, setBusquedaAlumno] = useState('');
  const [alumnoSeleccionado, setAlumnoSeleccionado] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [asistenciasAlumno, setAsistenciasAlumno] = useState<Asistencia[]>([]);
  const [cargandoAlumno, setCargandoAlumno] = useState(false);

  // Cargar profesores para admin
  const [profesores, setProfesores] = useState<any[]>([]);

  useEffect(() => {
    if (isAdmin) {
      apiFetch('/profesores')
        .then(r => r.json())
        .then(data => setProfesores(data))
        .catch(() => toast.error('Error al cargar profesores'));
    }
    // Cargar alumnos para el buscador
    apiFetch('/alumnos')
      .then(r => r.json())
      .then(data => setAlumnos(data))
      .catch(() => toast.error('Error al cargar alumnos'));
  }, []);

  // Consultar asistencias por fecha
  const consultarPorFecha = async () => {
    try {
      setCargandoFecha(true);
      const idProf = isAdmin ? profesorSeleccionado : user.idProfesor;
      if (!idProf) {
        toast.warning('Selecciona un profesor');
        return;
      }
      const res = await apiFetch(`/asistencia/profesor/${idProf}?fecha=${fecha}`);
      if (!res.ok) throw new Error('Error al cargar');
      const data = await res.json();
      setGruposFecha(data);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setCargandoFecha(false);
    }
  };

  // Consultar asistencias por alumno
  const consultarPorAlumno = async () => {
    if (!alumnoSeleccionado) {
      toast.warning('Selecciona un alumno');
      return;
    }
    try {
      setCargandoAlumno(true);
      let url = `/asistencia/alumno/${alumnoSeleccionado}`;
      const params = new URLSearchParams();
      if (fechaDesde) params.append('desde', fechaDesde);
      if (fechaHasta) params.append('hasta', fechaHasta);
      if (params.toString()) url += `?${params.toString()}`;
      const res = await apiFetch(url);
      if (!res.ok) throw new Error('Error al cargar');
      const data = await res.json();
      setAsistenciasAlumno(data);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setCargandoAlumno(false);
    }
  };

  const exportarCSV = () => {
    if (asistenciasAlumno.length === 0) return;
    const headers = ['Fecha', 'Grupo', 'Profesor', 'Estado', 'Comentario'];
    const rows = asistenciasAlumno.map(a => [
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
    toast.success('Exportado');
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
              <Users className="h-6 w-6 text-white" />
            </span>
            <span className="bg-gradient-to-r from-[#26AAA3] via-[#67A934] to-[#F8B50E] text-transparent bg-clip-text">
              Consulta de Asistencias
            </span>
          </h1>
          <div className="flex gap-2">
            <button
              onClick={() => setTab('fecha')}
              className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${tab === 'fecha' ? 'bg-[#26AAA3] text-white shadow-lg' : 'bg-white/20 text-white hover:bg-white/30'}`}
            >
              📅 Por fecha
            </button>
            <button
              onClick={() => setTab('alumno')}
              className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${tab === 'alumno' ? 'bg-[#26AAA3] text-white shadow-lg' : 'bg-white/20 text-white hover:bg-white/30'}`}
            >
              👤 Por alumno
            </button>
          </div>
        </div>

        {/* Contenido según pestaña */}
        <div className="bg-white/20 backdrop-blur-md rounded-2xl border border-white/20 shadow-xl flex-1 flex flex-col min-h-0 p-4">
          {tab === 'fecha' ? (
            // Pestaña: Por fecha
            <div className="flex flex-col h-full">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <div>
                  <label className="block text-xs text-white/80 font-medium mb-1">Fecha</label>
                  <input
                    type="date"
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    className="bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#26AAA3]"
                  />
                </div>
                {isAdmin && (
                  <div>
                    <label className="block text-xs text-white/80 font-medium mb-1">Profesor</label>
                    <select
                      value={profesorSeleccionado}
                      onChange={(e) => setProfesorSeleccionado(e.target.value)}
                      className="bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#26AAA3]"
                    >
                      <option value="">Seleccionar...</option>
                      {profesores.map((p) => (
                        <option key={p.idProfesor} value={p.idProfesor} className="text-gray-900">
                          {p.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <button
                  onClick={consultarPorFecha}
                  disabled={cargandoFecha}
                  className="bg-[#26AAA3] text-white px-4 py-2 rounded-full font-bold hover:scale-105 transition shadow-lg flex items-center gap-2 disabled:opacity-50 mt-4"
                >
                  {cargandoFecha ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  Consultar
                </button>
              </div>

              {cargandoFecha ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-white/30 border-t-white"></div>
                </div>
              ) : gruposFecha.length === 0 ? (
                <div className="text-center text-white/60 italic py-12">No hay asistencias registradas para esta fecha.</div>
              ) : (
                <div className="overflow-y-auto flex-1 space-y-4">
                  {gruposFecha.map((grupo) => (
                    <div key={grupo.idGrupo} className="bg-white/10 rounded-xl p-4 border border-white/10">
                      <h3 className="text-white font-bold text-lg mb-2">{grupo.nombreCurso} <span className="text-sm text-white/50">({grupo.diaClase} {grupo.horaClase})</span></h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {grupo.alumnos.map((alumno) => {
                          const estadoInfo = ESTADO_LABELS[alumno.estadoAsistencia as keyof typeof ESTADO_LABELS] || ESTADO_LABELS.ausente;
                          return (
                            <div key={alumno.idAlumno} className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${estadoInfo.color}`}>
                              <span className="text-white font-medium text-sm">{alumno.nombreAlumno}</span>
                              <span className="ml-auto flex items-center gap-1 text-xs">
                                {estadoInfo.icon}
                                {estadoInfo.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            // Pestaña: Por alumno
            <div className="flex flex-col h-full">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs text-white/80 font-medium mb-1">Buscar alumno</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
                    <input
                      type="text"
                      placeholder="Nombre o ID..."
                      value={busquedaAlumno}
                      onChange={(e) => setBusquedaAlumno(e.target.value)}
                      className="w-full bg-white/10 border border-white/20 rounded-xl pl-10 pr-4 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#26AAA3]"
                    />
                  </div>
                  {busquedaAlumno && (
                    <div className="absolute z-10 mt-1 w-full bg-gray-900/95 backdrop-blur-md rounded-xl border border-white/20 shadow-xl max-h-48 overflow-y-auto">
                      {alumnos.filter(a => a.nombreAlumno.toLowerCase().includes(busquedaAlumno.toLowerCase()) || a.idAlumno.toLowerCase().includes(busquedaAlumno.toLowerCase()))
                        .slice(0, 10).map(a => (
                          <button
                            key={a.idAlumno}
                            onClick={() => {
                              setAlumnoSeleccionado(a.idAlumno);
                              setBusquedaAlumno(`${a.idAlumno} - ${a.nombreAlumno}`);
                              setAsistenciasAlumno([]);
                            }}
                            className="w-full text-left px-4 py-2 text-white hover:bg-white/10 transition-colors text-sm"
                          >
                            {a.idAlumno} - {a.nombreAlumno}
                          </button>
                        ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs text-white/80 font-medium mb-1">Desde</label>
                  <input
                    type="date"
                    value={fechaDesde}
                    onChange={(e) => setFechaDesde(e.target.value)}
                    className="bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#26AAA3]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-white/80 font-medium mb-1">Hasta</label>
                  <input
                    type="date"
                    value={fechaHasta}
                    onChange={(e) => setFechaHasta(e.target.value)}
                    className="bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#26AAA3]"
                  />
                </div>
                <button
                  onClick={consultarPorAlumno}
                  disabled={cargandoAlumno || !alumnoSeleccionado}
                  className="bg-[#26AAA3] text-white px-4 py-2 rounded-full font-bold hover:scale-105 transition shadow-lg flex items-center gap-2 disabled:opacity-50 mt-4"
                >
                  {cargandoAlumno ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  Consultar
                </button>
                {asistenciasAlumno.length > 0 && (
                  <button
                    onClick={exportarCSV}
                    className="bg-[#F8B50E] text-gray-900 px-4 py-2 rounded-full font-bold hover:scale-105 transition shadow-lg flex items-center gap-2 mt-4"
                  >
                    <Download className="w-4 h-4" /> Exportar
                  </button>
                )}
              </div>

              {cargandoAlumno ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-white/30 border-t-white"></div>
                </div>
              ) : asistenciasAlumno.length === 0 ? (
                <div className="text-center text-white/60 italic py-12">
                  {alumnoSeleccionado ? 'No hay asistencias registradas para este alumno.' : 'Selecciona un alumno para ver su historial.'}
                </div>
              ) : (
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
                      {asistenciasAlumno.map((a) => {
                        const estadoInfo = ESTADO_LABELS[a.estado] || ESTADO_LABELS.ausente;
                        return (
                          <tr key={a._id} className="hover:bg-white/10 transition-colors">
                            <td className="px-3 py-2 whitespace-nowrap text-white/80">
                              {new Date(a.fecha).toLocaleDateString('es-ES')}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap font-mono text-white/80">{a.idGrupo}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-white/80">{a.idProfesor}</td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${estadoInfo.color}`}>
                                {estadoInfo.icon}
                                {estadoInfo.label}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-white/60 max-w-xs truncate">{a.comentario || '-'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Pie de página */}
        <div className="mt-2 flex justify-between items-center text-xs text-white/50 flex-shrink-0">
          <span>📋 {tab === 'fecha' ? gruposFecha.length : asistenciasAlumno.length} registros</span>
          <span>🔄 {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
        </div>
      </div>
    </BackgroundVideo>
  );
}