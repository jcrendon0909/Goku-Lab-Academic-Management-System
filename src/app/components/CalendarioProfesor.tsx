import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar as CalendarIcon, Clock, User, BookOpen, ArrowLeft, MapPin, Users, Tag, Repeat, Sparkles, ClipboardCheck } from 'lucide-react';
import { apiFetch } from '../../services/api';
import { Link } from 'react-router-dom';
import { ClassDetailsDialog } from './ClassDetailsDialog';
import { toast } from 'sonner';
import BackgroundVideo from './BackgroundVideo';

interface Clase {
  id: string;
  titulo: string;
  profesor: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  reagendada: boolean;
  studentId?: string;
  studentName?: string;
  idProfesor?: string;
  idGrupo?: string;
  teacher?: { id: string; name: string; email?: string; available?: boolean };
  students?: any[];
  comentarioGrupo?: string;
  diaClase?: string;
  cursoActivo?: boolean;
  idCurso?: string;
  profesorActivo?: boolean;
  capacidadMaxima?: number;
  alumnosInscritos?: number;
  estatus?: string;
  tipoReagendacionClase?: string | null;
  fechaHoraNueva?: Date | null;
  modalidad?: string;
  date?: Date;
}

export function CalendarioProfesor() {
  const navigate = useNavigate();
  const [clases, setClases] = useState<Clase[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [claseSeleccionada, setClaseSeleccionada] = useState<any>(null);
  const [dialogAbierto, setDialogAbierto] = useState(false);
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const idProfesor = user.idProfesor;

  const cargarClases = async () => {
    try {
      setCargando(true);
      setError(null);
      const url = idProfesor ? `/calendario?profesor=${idProfesor}` : '/calendario';
      const res = await apiFetch(url);
      
      if (!res.ok) {
        throw new Error(`Error al cargar: ${res.status}`);
      }

      const data = await res.json();
      console.log('📅 Datos del calendario:', data);

      let eventos: Clase[] = [];

      if (Array.isArray(data)) {
        eventos = data;
      } else if (data && typeof data === 'object') {
        const clasesBase = data.clasesBase || [];
        const reagendaciones = data.reagendaciones || [];

        const clasesBaseMapeadas = clasesBase.map((grupo: any) => ({
          id: grupo.idGrupo || `base-${Math.random()}`,
          titulo: grupo.nombreCurso || 'Clase',
          profesor: grupo.nombreProfesor || 'Sin profesor',
          fecha: grupo.diaClase || '',
          diaClase: grupo.diaClase || '',
          horaInicio: grupo.horaClase || '',
          horaFin: grupo.horaFin || '',
          reagendada: false,
          idProfesor: grupo.idProfesor || '',
          idGrupo: grupo.idGrupo,
          studentId: grupo.alumnos?.[0]?.idAlumno || '',
          studentName: grupo.alumnos?.[0]?.nombreAlumno || '',
          teacher: { id: grupo.idProfesor, name: grupo.nombreProfesor, available: grupo.profesorActivo },
          students: grupo.alumnos || [],
          comentarioGrupo: grupo.comentarioGrupo || '',
          date: new Date(grupo.diaClase ? obtenerFechaDesdeDia(grupo.diaClase) : Date.now()),
          startTime: grupo.horaClase,
          endTime: grupo.horaFin,
          title: grupo.nombreCurso,
          cursoActivo: grupo.cursoActivo,
          idCurso: grupo.idCurso,
          profesorActivo: grupo.profesorActivo,
          capacidadMaxima: grupo.capacidadMaxima,
          alumnosInscritos: grupo.alumnosInscritos,
          estatus: grupo.estatus,
          tipoReagendacionClase: null,
          fechaHoraNueva: null,
          modalidad: grupo.alumnos?.[0]?.modalidad || 'Presencial',
        }));

        const reagendacionesMapeadas = reagendaciones.map((grupo: any) => {
          const primeraReagendacion = grupo.alumnos?.[0]?.reagendacion;
          let fechaHoraNueva = null;
          let diaClase = grupo.diaClase || '';
          let horaInicio = grupo.horaClase || '';
          let horaFin = '';

          if (primeraReagendacion?.fechaHoraNueva) {
            const fecha = new Date(primeraReagendacion.fechaHoraNueva);
            if (!isNaN(fecha.getTime())) {
              fechaHoraNueva = fecha;
              const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
              diaClase = dias[fecha.getDay()] || grupo.diaClase || '';
              const horas = String(fecha.getHours()).padStart(2, '0');
              const minutos = String(fecha.getMinutes()).padStart(2, '0');
              horaInicio = `${horas}:${minutos}`;
              const duracion = grupo.duracion || '2 horas';
              let minutosDuracion = 120;
              const match = String(duracion).match(/(\d+(?:\.\d+)?)/);
              if (match) {
                minutosDuracion = parseFloat(match[1]) * 60;
              }
              const fechaFin = new Date(fecha.getTime() + minutosDuracion * 60000);
              horaFin = `${String(fechaFin.getHours()).padStart(2, '0')}:${String(fechaFin.getMinutes()).padStart(2, '0')}`;
            }
          }

          const modalidad = grupo.modalidad || 'Presencial';

          return {
            id: grupo.reagendacionId || `reag-${Math.random()}`,
            titulo: grupo.nombreCurso || 'Clase reagendada',
            profesor: grupo.nombreProfesor || 'Sin profesor',
            fecha: diaClase,
            diaClase: diaClase,
            horaInicio: horaInicio,
            horaFin: horaFin,
            reagendada: true,
            idProfesor: grupo.idProfesor || '',
            idGrupo: grupo.idGrupo,
            studentId: grupo.alumnos?.[0]?.idAlumno || '',
            studentName: grupo.alumnos?.[0]?.nombreAlumno || '',
            teacher: { id: grupo.idProfesor, name: grupo.nombreProfesor, available: true },
            students: grupo.alumnos || [],
            comentarioGrupo: grupo.comentarioGrupo || '',
            date: fechaHoraNueva || new Date(),
            startTime: horaInicio,
            endTime: horaFin,
            title: grupo.nombreCurso || 'Clase reagendada',
            cursoActivo: true,
            idCurso: grupo.idCurso,
            profesorActivo: true,
            capacidadMaxima: grupo.capacidadMaxima,
            alumnosInscritos: grupo.alumnosInscritos,
            estatus: grupo.estatus,
            tipoReagendacionClase: 'destino',
            fechaHoraNueva: fechaHoraNueva,
            modalidad: modalidad,
          };
        });

        eventos = [...clasesBaseMapeadas, ...reagendacionesMapeadas];
      }

      if (idProfesor && eventos.length > 0) {
        eventos = eventos.filter(
          (e) => e.idProfesor === idProfesor || e.profesor === user.nombreCompleto
        );
      }

      setClases(eventos);
    } catch (error) {
      console.error('Error al cargar calendario:', error);
      setError('No se pudo cargar el calendario. Intenta de nuevo.');
      setClases([]);
    } finally {
      setCargando(false);
    }
  };

  // Helper para obtener fecha desde el día de la semana (para clases recurrentes)
  const obtenerFechaDesdeDia = (diaClase: string) => {
    const diasSemana = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const hoy = new Date();
    const diaActual = hoy.getDay();
    const diaBuscado = diasSemana.indexOf(diaClase.toLowerCase());
    if (diaBuscado === -1) return hoy;
    const diff = diaBuscado - diaActual;
    const fecha = new Date(hoy);
    fecha.setDate(fecha.getDate() + diff);
    return fecha;
  };

  useEffect(() => {
    cargarClases();
  }, [idProfesor, user.nombreCompleto]);

  // Manejadores de eventos (existentes)
  const handleReagendar = (student: any) => {
    navigate(`/reschedule?classId=${claseSeleccionada?.id}&studentId=${student.idAlumno}&studentName=${encodeURIComponent(student.nombreAlumno)}`);
  };

  const handleInscribirAlumno = (classData: any) => {
    navigate(`/alumnos?grupoId=${classData.idGrupo}&accion=inscribir`);
  };

  const handleEliminarGrupo = (classData: any) => {
    if (window.confirm(`¿Eliminar el grupo ${classData.titulo}?`)) {
      toast.info('Eliminación de grupo pendiente de implementar');
    }
  };

  const handleGuardarComentarioGrupo = async (classData: any, comentario: string) => {
    try {
      const res = await apiFetch(`/grupos/${classData.id}/comentario`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comentario }),
      });
      if (!res.ok) throw new Error('Error al guardar comentario');
      toast.success('Comentario guardado');
      await cargarClases();
    } catch (error) {
      toast.error('Error al guardar comentario');
    }
  };

  const handleEliminarReagendacion = async (classData: any) => {
    if (!confirm('¿Eliminar esta reagendación temporal?')) return;
    try {
      const res = await apiFetch(`/reagendaciones/${classData.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Error al eliminar reagendación');
      toast.success('Reagendación eliminada');
      await cargarClases();
    } catch (error: any) {
      toast.error(error.message || 'Error al eliminar reagendación');
    }
  };

  const handleBajaAlumno = (student: any, classData: any) => {
    toast.info('Baja de alumno pendiente de implementar');
  };

  const handleEliminarReagendacionAlumno = async (student: any, classData: any) => {
    if (!confirm(`¿Quitar la reagendación de ${student.nombreAlumno}?`)) return;
    try {
      const idAlumno = student.idAlumno;
      const idGrupoNuevo = classData.idGrupo || classData.id;
      
      if (!idAlumno || !idGrupoNuevo) {
        throw new Error('Faltan datos para eliminar la reagendación');
      }

      const res = await apiFetch(`/reagendaciones/alumno/${idAlumno}/${idGrupoNuevo}`, {
        method: 'DELETE',
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Error al eliminar reagendación');
      }
      
      toast.success(`Reagendación de ${student.nombreAlumno} eliminada`);
      await cargarClases();
    } catch (error: any) {
      console.error('Error al eliminar reagendación:', error);
      toast.error(error.message || 'Error al eliminar reagendación');
    }
  };

  const handleActualizarInscripcion = async (student: any, classData: any, datos: { modalidad?: string; comentarios?: string }) => {
    try {
      const res = await apiFetch(`/inscripciones/${student.idAlumno}/${classData.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos),
      });
      if (!res.ok) throw new Error('Error al actualizar inscripción');
      toast.success('Inscripción actualizada');
      await cargarClases();
    } catch (error: any) {
      toast.error(error.message || 'Error al actualizar inscripción');
    }
  };

  // ✅ NUEVA FUNCIÓN: Abrir asistencia con la fecha de la clase
  const handleAbrirAsistencia = (clase: Clase) => {
    const fecha = clase.date || new Date();
    const fechaStr = fecha.toISOString().split('T')[0];
    navigate(`/asistencia?fecha=${fechaStr}`);
  };

  const decorativeVideos: { src: string; position: any }[] = [];

  if (cargando) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-[#F8B50E] mx-auto mb-4"></div>
          <p className="text-lg font-bold">📅 Cargando tu calendario...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="bg-white/90 backdrop-blur-sm p-8 rounded-2xl shadow-2xl max-w-md text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <p className="text-gray-700">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 bg-gradient-to-r from-[#26AAA3] to-[#67A934] text-white px-6 py-2 rounded-full hover:scale-105 transition-all shadow-lg"
          >
            Reintentar
          </button>
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
        <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-3 flex-shrink-0">
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="bg-white/20 backdrop-blur-sm p-2 rounded-full hover:bg-white/30 transition-all hover:scale-110">
              <ArrowLeft className="h-5 w-5 text-white" />
            </Link>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white drop-shadow-lg flex items-center gap-3">
              <span className="bg-gradient-to-r from-[#F8B50E] to-[#FFD700] p-2 rounded-full shadow-lg inline-flex items-center justify-center">
                <CalendarIcon className="h-6 w-6 text-gray-900" />
              </span>
              <span className="bg-gradient-to-r from-[#F8B50E] via-[#FFD700] to-white text-transparent bg-clip-text">
                Mi Calendario
              </span>
            </h1>
          </div>
          {idProfesor && (
            <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20">
              <span className="text-white text-sm font-medium flex items-center gap-2">
                <User className="h-4 w-4" />
                {user.nombreCompleto || 'Profesor'}
              </span>
            </div>
          )}
        </div>

        {/* Grid de clases */}
        {clases.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="bg-white/20 backdrop-blur-md rounded-2xl p-8 text-center max-w-md border border-white/20">
              <div className="text-6xl mb-4">🎯</div>
              <p className="text-white text-lg font-medium">No tienes clases programadas</p>
              <p className="text-white/70 text-sm mt-2">Las clases que se te asignen aparecerán aquí</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto pr-1 pb-2">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {clases.map((clase) => {
                const modalidad = clase.modalidad || 'Presencial';
                const isReagendada = clase.reagendada;

                return (
                  <div
                    key={clase.id}
                    className={`
                      group relative bg-white/20 backdrop-blur-md rounded-2xl p-5 
                      border border-white/20 hover:border-white/40 
                      shadow-lg hover:shadow-2xl 
                      transition-all duration-300
                      hover:scale-[1.02] hover:-translate-y-1
                      ${isReagendada ? 'ring-2 ring-[#F8B50E]/50' : ''}
                    `}
                  >
                    {isReagendada && (
                      <div className="absolute -top-2 -right-2 bg-gradient-to-r from-[#F8B50E] to-[#FFD700] text-gray-900 text-[10px] font-bold px-2.5 py-1 rounded-full shadow-lg flex items-center gap-1">
                        <Repeat className="h-3 w-3" />
                        Reagendada
                      </div>
                    )}

                    <div className="flex flex-col h-full">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <h3 className="font-bold text-white text-base flex items-center gap-2 flex-1">
                          <BookOpen className="h-4 w-4 text-[#F8B50E] flex-shrink-0" />
                          <span className="line-clamp-2">{clase.titulo}</span>
                        </h3>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase flex-shrink-0 ${
                          modalidad === 'Virtual' 
                            ? 'bg-purple-500/80 text-white' 
                            : 'bg-emerald-500/80 text-white'
                        }`}>
                          {modalidad === 'Virtual' ? '💻 Virtual' : '🏫 Presencial'}
                        </span>
                      </div>

                      <p className="text-white/80 text-sm flex items-center gap-2 mb-3">
                        <User className="h-3.5 w-3.5 text-white/50" />
                        {clase.profesor}
                      </p>

                      <div className="flex flex-wrap items-center gap-3 text-sm text-white/70 mb-3">
                        <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full">
                          <Clock className="h-3.5 w-3.5" />
                          {clase.horaInicio} {clase.horaFin ? `- ${clase.horaFin}` : ''}
                        </span>
                        <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full">
                          <CalendarIcon className="h-3.5 w-3.5" />
                          {clase.diaClase || 'Fecha por definir'}
                        </span>
                      </div>

                      {clase.studentId && clase.studentName && (
                        <div className="mt-auto pt-3 border-t border-white/10">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-white/60">Alumno:</span>
                            <span className="text-sm font-medium text-white bg-white/10 px-3 py-1 rounded-full">
                              {clase.studentName}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* ✅ BOTÓN DE ASISTENCIA */}
                      <div className="mt-3 pt-3 border-t border-white/10 flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAbrirAsistencia(clase);
                          }}
                          className="flex-1 bg-[#26AAA3]/80 hover:bg-[#26AAA3] text-white text-xs font-bold px-3 py-1.5 rounded-full transition-all hover:scale-105 flex items-center justify-center gap-1.5 shadow-lg"
                        >
                          <ClipboardCheck className="w-3.5 h-3.5" />
                          📋 Asistencia
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setClaseSeleccionada(clase);
                            setDialogAbierto(true);
                          }}
                          className="bg-white/20 hover:bg-white/30 text-white text-xs font-medium px-3 py-1.5 rounded-full transition-all hover:scale-105 flex items-center gap-1"
                        >
                          <span>Detalles</span>
                          <span className="text-white/50">→</span>
                        </button>
                      </div>

                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-white/0 via-white/5 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-2 flex justify-between items-center text-xs text-white/50 flex-shrink-0">
          <span>📋 {clases.length} clases programadas</span>
          <span>🔄 {clases.filter(c => c.reagendada).length} reagendadas</span>
        </div>
      </div>

      {/* Diálogo de detalles de clase (con botón de asistencia) */}
      {claseSeleccionada && (
        <ClassDetailsDialog
          classData={claseSeleccionada}
          isOpen={dialogAbierto}
          puedeEditar={user.rol === 'admin'}
          onClose={() => setDialogAbierto(false)}
          onReagendar={handleReagendar}
          onInscribirAlumno={handleInscribirAlumno}
          onEliminarGrupo={handleEliminarGrupo}
          onGuardarComentarioGrupo={handleGuardarComentarioGrupo}
          onEliminarReagendacion={handleEliminarReagendacion}
          onBajaAlumno={handleBajaAlumno}
          onEliminarReagendacionAlumno={handleEliminarReagendacionAlumno}
          onActualizarInscripcion={handleActualizarInscripcion}
          // ✅ PASAMOS LA FUNCIÓN DE ASISTENCIA AL DIÁLOGO
          onAsistencia={() => {
            handleAbrirAsistencia(claseSeleccionada);
            setDialogAbierto(false);
          }}
        />
      )}
    </BackgroundVideo>
  );
}