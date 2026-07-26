import React, { useEffect, useState } from 'react';
import { apiFetch, getAlumnos, getGrupos } from '../../services/api';
import { toast } from 'sonner';
import ReagendacionForm from './ReagendacionForm';
import BackgroundVideo from './BackgroundVideo';
import { Calendar, RefreshCw, User, BookOpen, Clock, Repeat, Trash2 } from 'lucide-react';

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

export function ReagendacionesPage() {
  const [reagendaciones, setReagendaciones] = useState<Reagendacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [alumnoSeleccionado, setAlumnoSeleccionado] = useState('');
  const [grupoSeleccionado, setGrupoSeleccionado] = useState('');
  const [cargandoDatos, setCargandoDatos] = useState(false);

  const cargarReagendaciones = async () => {
    try {
      setCargando(true);
      const res = await apiFetch('/reagendaciones');
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
      setCargandoDatos(true);
      const [alumnosRes, gruposRes] = await Promise.all([
        getAlumnos(),
        getGrupos(),
      ]);
      setAlumnos(alumnosRes);
      setGrupos(gruposRes);
    } catch (error) {
      toast.error('Error al cargar catálogos');
    } finally {
      setCargandoDatos(false);
    }
  };

  useEffect(() => {
    cargarReagendaciones();
    cargarCatalogos();
  }, []);

  const eliminarReagendacion = async (id: string) => {
    if (!confirm('¿Eliminar esta reagendación?')) return;
    try {
      const res = await apiFetch(`/reagendaciones/${id}`, { method: 'DELETE' });
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

    // Construir objeto "clase" simulado para el formulario
    const clase = {
      id: grupo.IdGrupo,
      title: grupo.nombreCurso,
      nombreCurso: grupo.nombreCurso,
      profesor: grupo.nombreProfesor,
      teacher: { name: grupo.nombreProfesor },
      nombreProfesor: grupo.nombreProfesor,
      idProfesor: '', // Opcional, se puede omitir
      startTime: grupo.horaClase,
      diaClase: grupo.diaClase,
      date: new Date(), // Fecha actual como placeholder
      duracion: '2 horas', // Valor por defecto
    };

    const data = {
      alumno: {
        idAlumno: alumno.idAlumno,
        nombreAlumno: alumno.nombreAlumno,
        modalidad: 'Presencial', // Se puede mejorar
      },
      clase,
    };

    setMostrarForm(true);
  };

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
                setMostrarForm(true);
              }}
              className="bg-gradient-to-r from-[#F8B50E] to-[#FFD700] text-gray-900 px-5 py-2 rounded-full font-bold hover:scale-105 transition-all shadow-lg flex items-center gap-2"
            >
              <Repeat className="h-5 w-5" />
              Nueva Reagendación
            </button>
          </div>
        </div>

        {/* Selectores rápidos para crear reagendación */}
        <div className="bg-white/20 backdrop-blur-md rounded-2xl p-4 mb-4 border border-white/20 flex flex-wrap items-center gap-3 flex-shrink-0">
          <div className="flex-1 min-w-[150px]">
            <label className="block text-xs text-white/80 font-medium mb-1">Alumno</label>
            <select
              value={alumnoSeleccionado}
              onChange={(e) => setAlumnoSeleccionado(e.target.value)}
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
              {grupos.map(g => (
                <option key={g.IdGrupo} value={g.IdGrupo} className="text-gray-900">
                  {g.IdGrupo} - {g.nombreCurso} ({g.diaClase} {g.horaClase})
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={abrirFormulario}
            className="bg-gradient-to-r from-[#26AAA3] to-[#67A934] text-white px-6 py-2 rounded-full font-bold hover:scale-105 transition-all shadow-lg mt-2 md:mt-0"
          >
            <Repeat className="h-4 w-4 inline mr-1" />
            Crear
          </button>
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
                {reagendaciones.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-white/60 italic">
                      🧐 No hay reagendaciones registradas
                    </td>
                  </tr>
                ) : (
                  reagendaciones.map((r, index) => (
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
          <span>📋 {reagendaciones.length} reagendaciones</span>
          <span>🔄 {reagendaciones.filter(r => r.tipoReagendacion === 'temporal').length} temporales • {reagendaciones.filter(r => r.tipoReagendacion === 'permanente').length} permanentes</span>
        </div>
      </div>

      {/* Modal del formulario */}
      {mostrarForm && (
        <ReagendacionForm
          data={null} // Se puede pasar null y el formulario manejará la creación desde cero con selectores internos, pero mejor lo dejamos con la lógica actual.
          onClose={() => {
            setMostrarForm(false);
            setAlumnoSeleccionado('');
            setGrupoSeleccionado('');
          }}
          onSuccess={() => {
            setMostrarForm(false);
            cargarReagendaciones();
            setAlumnoSeleccionado('');
            setGrupoSeleccionado('');
          }}
        />
      )}
    </BackgroundVideo>
  );
}