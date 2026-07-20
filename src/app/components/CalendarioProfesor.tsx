import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar as CalendarIcon, Clock, User, BookOpen, ArrowLeft } from 'lucide-react';
import { apiFetch } from '../../services/api';
import { Link } from 'react-router-dom';
import { ClassDetailsDialog } from './ClassDetailsDialog';
import { toast } from 'sonner';

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
          date: new Date(),
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
        }));

        const reagendacionesMapeadas = reagendaciones.map((grupo: any) => ({
          id: grupo.reagendacionId || `reag-${Math.random()}`,
          titulo: grupo.nombreCurso || 'Clase reagendada',
          profesor: grupo.nombreProfesor || 'Sin profesor',
          fecha: grupo.diaClase || '',
          diaClase: grupo.diaClase || '',
          horaInicio: grupo.horaClase || '',
          horaFin: '',
          reagendada: true,
          idProfesor: grupo.idProfesor || '',
          idGrupo: grupo.idGrupo,
          studentId: grupo.alumnos?.[0]?.idAlumno || '',
          studentName: grupo.alumnos?.[0]?.nombreAlumno || '',
          teacher: { id: grupo.idProfesor, name: grupo.nombreProfesor, available: true },
          students: grupo.alumnos || [],
          comentarioGrupo: grupo.comentarioGrupo || '',
          date: new Date(),
          startTime: grupo.horaClase,
          endTime: '',
          title: grupo.nombreCurso || 'Clase reagendada',
          cursoActivo: true,
          idCurso: grupo.idCurso,
          profesorActivo: true,
          capacidadMaxima: grupo.capacidadMaxima,
          alumnosInscritos: grupo.alumnosInscritos,
          estatus: grupo.estatus,
          tipoReagendacionClase: 'destino',
        }));

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

  useEffect(() => {
    cargarClases();
  }, [idProfesor, user.nombreCompleto]);

  // Manejadores para las acciones del diálogo
  const handleReagendar = (student: any) => {
    navigate(`/reschedule?classId=${claseSeleccionada?.id}&studentId=${student.idAlumno}&studentName=${encodeURIComponent(student.nombreAlumno)}`);
  };

  const handleInscribirAlumno = (classData: any) => {
    navigate(`/alumnos?grupoId=${classData.idGrupo}&accion=inscribir`);
  };

  const handleEliminarGrupo = (classData: any) => {
    if (window.confirm(`¿Eliminar el grupo ${classData.titulo}?`)) {
      // Llamar a la API para eliminar grupo (pendiente de implementar)
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
    // Llamar a la API para dar de baja al alumno del grupo
    toast.info('Baja de alumno pendiente de implementar');
  };

  const handleEliminarReagendacionAlumno = (student: any, classData: any) => {
    // Llamar a la API para eliminar la reagendación del alumno
    toast.info('Eliminación de reagendación de alumno pendiente de implementar');
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

  if (cargando) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#26AAA3] mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando tu calendario...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-xl shadow-md max-w-md">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <p className="text-gray-700">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 bg-[#26AAA3] text-white px-4 py-2 rounded-lg hover:bg-[#1f8c86]"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link to="/dashboard" className="text-gray-600 hover:text-gray-900">
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CalendarIcon className="h-6 w-6 text-[#26AAA3]" />
            Mi Calendario de Clases
          </h1>
          {idProfesor && (
            <span className="text-sm text-gray-500 ml-2">
              (Clases de {user.nombreCompleto || 'tu'})
            </span>
          )}
        </div>

        {clases.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-8 text-center">
            <p className="text-gray-500">No tienes clases programadas.</p>
            <p className="text-sm text-gray-400 mt-2">Las clases que se te asignen aparecerán aquí.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clases.map((clase) => (
              <div
                key={clase.id}
                onClick={() => {
                  setClaseSeleccionada(clase);
                  setDialogAbierto(true);
                }}
                className={`bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow p-4 border-l-4 cursor-pointer ${
                  clase.reagendada ? 'border-yellow-400' : 'border-[#26AAA3]'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-[#26AAA3]" />
                      {clase.titulo}
                    </h3>
                    <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                      <User className="h-3 w-3" />
                      {clase.profesor}
                    </p>
                  </div>
                  {clase.reagendada && (
                    <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full whitespace-nowrap">
                      Reagendada
                    </span>
                  )}
                </div>

                <div className="mt-3 flex items-center gap-4 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {clase.horaInicio} - {clase.horaFin || 'Fin por definir'}
                  </span>
                  <span className="text-gray-300">|</span>
                  <span>{clase.diaClase || 'Fecha por definir'}</span>
                </div>

                {clase.studentId && clase.studentName && (
                  <div className="mt-2 text-xs text-gray-500">
                    Alumno: {clase.studentName}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Diálogo de detalles de clase */}
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
        />
      )}
    </div>
  );
}