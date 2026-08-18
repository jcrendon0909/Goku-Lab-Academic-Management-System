import React, { useEffect, useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import * as API from '../../services/api';
import { toast } from 'sonner';
import BackgroundVideo from './BackgroundVideo';
import { Calendar, RefreshCw, User, BookOpen, Clock, Repeat, Trash2, Search, Filter } from 'lucide-react';
import ReagendacionForm from './ReagendacionForm';

interface Reagendacion {
  _id: string;
  ReagendacionId: string;
  idAlumno: string;
  nombreAlumno: string;
  idGrupoOrigen: string;
  idGrupoNuevo: string;
  nombreCurso: string;
  profesorOriginal: string;
  profesorNuevo: string;
  fechaHoraOriginal: string;
  fechaHoraNueva: string;
  tipoReagendacion: 'temporal' | 'permanente';
  modalidad: string;
  estatus: string;
  createdAt: string;
}

interface Alumno {
  idAlumno: string;
  nombreAlumno: string;
}

interface Grupo {
  IdGrupo: string;
  nombreCurso: string;
  nombreProfesor: string;
  diaClase: string;
  horaClase: string;
}

interface Inscripcion {
  idAlumno: string;
  grupoId: string;
  nombreAlumno: string;
  modalidad: string;
  estatus: string;
}

export function ReschedulingFlow() {
  const location = useLocation();
  const [reagendaciones, setReagendaciones] = useState<Reagendacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [inscripciones, setInscripciones] = useState<Inscripcion[]>([]);
  const [alumnoSeleccionado, setAlumnoSeleccionado] = useState('');
  const [grupoSeleccionado, setGrupoSeleccionado] = useState('');
  const [filtro, setFiltro] = useState('');
  const [dataForm, setDataForm] = useState<any>(null);

  // ✅ Grupos filtrados según el alumno seleccionado
  const gruposFiltrados = useMemo(() => {
    if (!alumnoSeleccionado) return grupos;
    // Obtener los IDs de los grupos donde el alumno tiene inscripción activa
    const gruposIds = inscripciones
      .filter(ins => ins.idAlumno === alumnoSeleccionado && ins.estatus === 'Activa')
      .map(ins => ins.grupoId);
    return grupos.filter(g => gruposIds.includes(g.IdGrupo));
  }, [alumnoSeleccionado, inscripciones, grupos]);

  // Cargar datos al montar
  useEffect(() => {
    cargarReagendaciones();
    cargarCatalogos();
    cargarInscripciones();

    // Si viene de un enlace con parámetros (ej. desde calendario)
    const params = new URLSearchParams(location.search);
    const classId = params.get('classId');
    const studentId = params.get('studentId');
    const studentName = params.get('studentName');
    if (classId && studentId) {
      toast.info('Precargando datos para reagendación');
    }
  }, []);

  const cargarReagendaciones = async () => {
    try {
      setCargando(true);
      const res = await API.apiFetch('/reagendaciones');
      if (!res.ok) throw new Error('Error al cargar reagendaciones');
      const data = await res.json();
      setReagendaciones(data);
    } catch (error: any) {
      toast.error(error.message || 'Error al cargar reagendaciones');
    } finally {
      setCargando(false);
    }
  };

  const cargarCatalogos = async () => {
    try {
      const [alumnosRes, gruposRes] = await Promise.all([
        API.getAlumnos(),
        API.getGrupos(),
      ]);
      setAlumnos(alumnosRes);
      setGrupos(gruposRes);
    } catch (error) {
      toast.error('Error al cargar catálogos');
    }
  };

  const cargarInscripciones = async () => {
    try {
      const res = await API.apiFetch('/inscripciones');
      if (!res.ok) throw new Error('Error al cargar inscripciones');
      const data = await res.json();
      setInscripciones(data);
    } catch (error) {
      toast.error('Error al cargar inscripciones');
    }
  };

  // ✅ Cuando se selecciona un alumno, se actualiza el grupo seleccionado a vacío para evitar inconsistencias
  const handleAlumnoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setAlumnoSeleccionado(e.target.value);
    setGrupoSeleccionado(''); // resetear grupo
  };

  const eliminarReagendacion = async (id: string) => {
    if (!confirm('¿Eliminar esta reagendación?')) return;
    try {
      const res = await API.apiFetch(`/reagendaciones/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar');
      toast.success('Reagendación eliminada');
      cargarReagendaciones();
    } catch (error: any) {
      toast.error(error.message || 'Error al eliminar');
    }
  };

  const abrirFormulario = () => {
    if (!alumnoSeleccionado || !grupoSeleccionado) {
      toast.warning('Selecciona un alumno y un grupo');
      return;
    }
    const alumno = alumnos.find(a => a.idAlumno === alumnoSeleccionado);
    const grupo = grupos.find(g => g.IdGrupo === grupoSeleccionado);
    if (!alumno || !grupo) {
      toast.error('Datos no encontrados');
      return;
    }

    // Construir objeto "clase" para el formulario
    const clase = {
      id: grupo.IdGrupo,
      title: grupo.nombreCurso,
      nombreCurso: grupo.nombreCurso,
      profesor: grupo.nombreProfesor,
      teacher: { name: grupo.nombreProfesor },
      nombreProfesor: grupo.nombreProfesor,
      idProfesor: '',
      startTime: grupo.horaClase,
      diaClase: grupo.diaClase,
      date: new Date(),
      duracion: '2 horas',
      idGrupo: grupo.IdGrupo,
    };

    const data = {
      alumno: {
        idAlumno: alumno.idAlumno,
        nombreAlumno: alumno.nombreAlumno,
        modalidad: 'Presencial', // se puede mejorar obteniendo de inscripción
      },
      clase,
    };

    setDataForm(data);
    setMostrarForm(true);
  };

  // Filtrar reagendaciones
  const reagendacionesFiltradas = reagendaciones.filter(r => {
    if (!filtro) return true;
    const q = filtro.toLowerCase();
    return (
      r.nombreAlumno.toLowerCase().includes(q) ||
      r.nombreCurso.toLowerCase().includes(q) ||
      r.ReagendacionId.toLowerCase().includes(q)
    );
  });

  if (cargando) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-[#F8B50E] mx-auto mb-4"></div>
          <p className="text-lg font-bold">📅 Cargando reagendaciones...</p>
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
            <span className="bg-gradient-to-r from-[#F8B50E] to-[#FFD700] p-2 rounded-full shadow-lg inline-flex items-center justify-center">
              <Repeat className="h-6 w-6 text-gray-900" />
            </span>
            <span className="bg-gradient-to-r from-[#F8B50E] via-[#FFD700] to-white text-transparent bg-clip-text">
              Reagendaciones
            </span>
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={cargarReagendaciones}
              className="bg-white/20 backdrop-blur-sm p-2 rounded-full hover:bg-white/30 transition-all border border-white/20"
              title="Recargar"
            >
              <RefreshCw className="h-5 w-5 text-white" />
            </button>
            <button
              onClick={() => {
                setAlumnoSeleccionado('');
                setGrupoSeleccionado('');
                setDataForm(null);
                setMostrarForm(true);
              }}
              className="bg-gradient-to-r from-[#F8B50E] to-[#FFD700] text-gray-900 px-5 py-2 rounded-full font-bold hover:scale-105 transition-all shadow-lg flex items-center gap-2"
            >
              <Repeat className="h-5 w-5" />
              Nueva Reagendación
            </button>
          </div>
        </div>

        {/* Selectores rápidos - CON FILTRO DE GRUPOS POR ALUMNO */}
        <div className="bg-white/20 backdrop-blur-md rounded-2xl p-4 mb-4 border border-white/20 flex flex-wrap items-center gap-3 flex-shrink-0">
          <div className="flex-1 min-w-[150px]">
            <label className="block text-xs text-white/80 font-medium mb-1">Alumno</label>
            <select
              value={alumnoSeleccionado}
              onChange={handleAlumnoChange}
              className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#F8B50E]"
            >
              <option value="">Seleccionar...</option>
              {alumnos.map(a => (
                <option key={a.idAlumno} value={a.idAlumno} className="text-gray-900">
                  {a.idAlumno} - {a.nombreAlumno}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="block text-xs text-white/80 font-medium mb-1">Grupo / Clase</label>
            <select
              value={grupoSeleccionado}
              onChange={(e) => setGrupoSeleccionado(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#F8B50E]"
            >
              <option value="">Seleccionar...</option>
              {gruposFiltrados.length === 0 && alumnoSeleccionado && (
                <option value="" disabled>⚠️ Este alumno no tiene cursos activos</option>
              )}
              {gruposFiltrados.map(g => (
                <option key={g.IdGrupo} value={g.IdGrupo} className="text-gray-900">
                  {g.IdGrupo} - {g.nombreCurso} ({g.diaClase} {g.horaClase})
                </option>
              ))}
            </select>
            {alumnoSeleccionado && gruposFiltrados.length === 0 && (
              <p className="text-xs text-amber-300 mt-1">⚠️ El alumno no está inscrito en ningún grupo activo.</p>
            )}
          </div>
          <button
            onClick={abrirFormulario}
            className="bg-gradient-to-r from-[#26AAA3] to-[#67A934] text-white px-6 py-2 rounded-full font-bold hover:scale-105 transition-all shadow-lg mt-2 md:mt-0"
          >
            <Repeat className="h-4 w-4 inline mr-1" />
            Crear
          </button>
        </div>

        {/* Filtro de búsqueda */}
        <div className="mb-4 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/50" />
            <input
              type="text"
              placeholder="Buscar por alumno, curso o ID..."
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              className="w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl pl-10 pr-4 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#F8B50E]"
            />
          </div>
        </div>

        {/* Tabla de reagendaciones */}
        <div className="bg-white/20 backdrop-blur-md rounded-2xl overflow-hidden border border-white/20 shadow-xl flex-1 flex flex-col min-h-0">
          <div className="overflow-x-auto overflow-y-auto flex-1">
            <table className="w-full table-auto divide-y divide-white/10 text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="bg-gradient-to-r from-[#F8B50E] to-[#FFD700] text-gray-900">
                  <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider">ID</th>
                  <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider">Alumno</th>
                  <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider">Curso</th>
                  <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider">Origen</th>
                  <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider">Destino</th>
                  <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider">Fecha Nueva</th>
                  <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider">Tipo</th>
                  <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider">Modalidad</th>
                  <th className="px-3 py-2 text-right text-xs font-bold uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {reagendacionesFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-white/60 italic">
                      🧐 No hay reagendaciones registradas
                    </td>
                  </tr>
                ) : (
                  reagendacionesFiltradas.map((r, index) => (
                    <tr
                      key={r._id}
                      className={`hover:bg-white/10 transition-colors ${
                        index % 2 === 0 ? 'bg-white/5' : 'bg-white/0'
                      }`}
                    >
                      <td className="px-3 py-2 whitespace-nowrap font-mono text-sm text-white/90">{r.ReagendacionId}</td>
                      <td className="px-3 py-2 whitespace-nowrap font-medium text-white">{r.nombreAlumno}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-white/80">{r.nombreCurso}</td>
                      <td className="px-3 py-2 whitespace-nowrap font-mono text-sm text-white/60">{r.idGrupoOrigen}</td>
                      <td className="px-3 py-2 whitespace-nowrap font-mono text-sm text-white/60">{r.idGrupoNuevo}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-white/80">
                        {new Date(r.fechaHoraNueva).toLocaleString()}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${
                          r.tipoReagendacion === 'temporal' ? 'bg-blue-500/80 text-white' : 'bg-green-500/80 text-white'
                        }`}>
                          {r.tipoReagendacion === 'temporal' ? '⏰ Temporal' : '♻️ Permanente'}
                        </span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                          r.modalidad === 'Virtual' ? 'bg-purple-500/80 text-white' : 'bg-emerald-500/80 text-white'
                        }`}>
                          {r.modalidad}
                        </span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-right">
                        <button
                          onClick={() => eliminarReagendacion(r._id)}
                          className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-rose-400 hover:text-rose-300 transition-all hover:scale-110"
                          title="Eliminar reagendación"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pie de página */}
        <div className="mt-2 flex justify-between items-center text-xs text-white/50 flex-shrink-0">
          <span>📋 {reagendacionesFiltradas.length} reagendaciones</span>
          <span>
            🔄 {reagendacionesFiltradas.filter(r => r.tipoReagendacion === 'temporal').length} temporales
            • ♻️ {reagendacionesFiltradas.filter(r => r.tipoReagendacion === 'permanente').length} permanentes
          </span>
        </div>
      </div>

      {/* Modal del formulario */}
      {mostrarForm && (
        <ReagendacionForm
          data={dataForm}
          onClose={() => {
            setMostrarForm(false);
            setDataForm(null);
          }}
          onSuccess={() => {
            setMostrarForm(false);
            setDataForm(null);
            cargarReagendaciones();
            toast.success('Reagendación creada exitosamente');
          }}
        />
      )}
    </BackgroundVideo>
  );
}