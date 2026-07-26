import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiFetch } from '../../services/api';
import { toast } from 'sonner';
import BackgroundVideo from './BackgroundVideo';
import { ArrowLeft, User, Trash2, Plus, Calendar, Clock, DollarSign, Users, UserPlus } from 'lucide-react';
import { AsignacionProfesorVeranoForm } from './AsignacionProfesorVeranoForm';
import { InscripcionVeranoForm } from './InscripcionVeranoForm';

interface Asignacion {
  _id: string;
  idProfesor: string;
  nombreProfesor: string;
  dias: number[];
  horasPorDia: number;
  costoHora: number;
  semanas: number;
}

interface Curso {
  idCursoVerano: string;
  nombre: string;
  modalidad: string;
  año: number;
  fechaInicio: string;
  fechaFin: string;
  estatus: string;
}

interface Inscripcion {
  _id: string;
  idAlumno: string;
  nombreAlumno: string;
  montoPago: number;
  semanasPagadas: number;
  fechaInicio: string;
  fechaFin: string;
  notas: string;
}

const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export function CursoVeranoDetalle() {
  const { id } = useParams<{ id: string }>();
  const [curso, setCurso] = useState<Curso | null>(null);
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);
  const [inscripciones, setInscripciones] = useState<Inscripcion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarFormAsignacion, setMostrarFormAsignacion] = useState(false);
  const [mostrarFormInscripcion, setMostrarFormInscripcion] = useState(false);
  const [asignacionEditando, setAsignacionEditando] = useState<Asignacion | null>(null);

  const cargarDatos = async () => {
    if (!id) return;
    try {
      setCargando(true);
      const [resCurso, resAsignaciones, resInscripciones] = await Promise.all([
        apiFetch(`/cursos-verano/${id}`),
        apiFetch(`/cursos-verano/${id}/asignaciones`),
        apiFetch(`/cursos-verano/${id}/inscripciones`)
      ]);

      if (!resCurso.ok) throw new Error('Error al cargar curso');
      if (!resAsignaciones.ok) throw new Error('Error al cargar asignaciones');
      if (!resInscripciones.ok) throw new Error('Error al cargar inscripciones');

      const cursoData = await resCurso.json();
      const asignacionesData = await resAsignaciones.json();
      const inscripcionesData = await resInscripciones.json();

      setCurso(cursoData);
      setAsignaciones(asignacionesData);
      setInscripciones(inscripcionesData);
    } catch (error) {
      toast.error('Error al cargar datos');
      console.error(error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [id]);

  const eliminarAsignacion = async (asignacionId: string) => {
    if (!confirm('¿Eliminar esta asignación?')) return;
    try {
      const res = await apiFetch(`/cursos-verano/asignaciones/${asignacionId}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Error al eliminar');
      toast.success('Asignación eliminada');
      cargarDatos();
    } catch (error) {
      toast.error('Error al eliminar');
      console.error(error);
    }
  };

  const eliminarInscripcion = async (inscripcionId: string) => {
    if (!confirm('¿Eliminar esta inscripción?')) return;
    try {
      const res = await apiFetch(`/cursos-verano/inscripciones/${inscripcionId}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Error al eliminar');
      toast.success('Inscripción eliminada');
      cargarDatos();
    } catch (error) {
      toast.error('Error al eliminar');
      console.error(error);
    }
  };

  // ✅ Eliminar videos decorativos - array vacío
  const decorativeVideos: { src: string; position: any }[] = [];

  if (cargando) {
    return <div className="p-8 text-center text-gray-500">⏳ Cargando...</div>;
  }

  if (!curso) {
    return <div className="p-8 text-center text-gray-500">Curso no encontrado</div>;
  }

  return (
    <BackgroundVideo
      videoSrc="https://media.gokulab.mx/Galery/videos/codyanimado.mp4"  // ✅ Nuevo video de fondo
      decorativeVideos={decorativeVideos}  // ✅ Sin videos decorativos
    >
      <div className="p-4 md:p-6 w-full max-w-5xl mx-auto">
        <Link
          to="/cursos-verano"
          className="inline-flex items-center gap-2 text-white hover:text-yellow-300 transition-colors mb-4 group"
        >
          <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
          <span>Volver a la lista</span>
        </Link>

        <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-2xl border-2 border-yellow-200 p-6">
          {/* Cabecera del curso */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{curso.nombre}</h1>
              <p className="text-sm text-gray-600">
                {curso.modalidad === 'verano' ? '☀️ Verano' : '🌊 Preverano'} - {curso.año}
              </p>
              <p className="text-sm text-gray-600">
                📅 {new Date(curso.fechaInicio).toLocaleDateString()} - {new Date(curso.fechaFin).toLocaleDateString()}
              </p>
              <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold ${
                curso.estatus === 'activo' ? 'bg-green-100 text-green-700' :
                curso.estatus === 'finalizado' ? 'bg-blue-100 text-blue-700' :
                'bg-red-100 text-red-700'
              }`}>
                {curso.estatus === 'activo' ? '✅ Activo' :
                 curso.estatus === 'finalizado' ? '📌 Finalizado' : '⛔ Cancelado'}
              </span>
            </div>
            <button
              onClick={() => {
                setAsignacionEditando(null);
                setMostrarFormAsignacion(true);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-medium flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Asignar profesor
            </button>
          </div>

          {/* Profesores asignados */}
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <User className="h-5 w-5 text-blue-600" />
            Profesores asignados ({asignaciones.length})
          </h2>

          {asignaciones.length === 0 ? (
            <p className="text-sm text-gray-500 bg-gray-50 p-4 rounded-xl border-2 border-dashed border-gray-200 text-center">
              😅 No hay profesores asignados aún.
            </p>
          ) : (
            <div className="space-y-3 mb-8">
              {asignaciones.map((asig) => (
                <div key={asig._id} className="bg-white border-2 border-blue-100 rounded-xl p-4 hover:border-blue-300 transition">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-bold text-gray-900">{asig.nombreProfesor}</p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {asig.dias.map(d => DIAS_SEMANA[d]).join(', ')}
                        </span>
                        <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {asig.horasPorDia}h/día
                        </span>
                        <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          ${asig.costoHora}/hora
                        </span>
                        <span className="text-xs bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded-full">
                          {asig.semanas} semanas
                        </span>
                        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
                          Total: {asig.dias.length * asig.horasPorDia * asig.semanas}h
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setAsignacionEditando(asig);
                          setMostrarFormAsignacion(true);
                        }}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => eliminarAsignacion(asig._id)}
                        className="text-red-600 hover:text-red-800 transition"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Alumnos inscritos */}
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Users className="h-5 w-5 text-green-600" />
                Alumnos inscritos ({inscripciones.length})
              </h2>
              <button
                onClick={() => setMostrarFormInscripcion(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition font-medium flex items-center gap-2"
              >
                <UserPlus className="h-4 w-4" />
                Inscribir alumno
              </button>
            </div>

            {inscripciones.length === 0 ? (
              <p className="text-sm text-gray-500 bg-gray-50 p-4 rounded-xl border-2 border-dashed border-gray-200 text-center">
                😅 No hay alumnos inscritos aún.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase">Alumno</th>
                      <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase">Monto</th>
                      <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase">Semanas</th>
                      <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase">Inicio</th>
                      <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase">Fin</th>
                      <th className="px-4 py-2 text-right text-xs font-bold text-gray-700 uppercase">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {inscripciones.map((ins) => (
                      <tr key={ins._id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm font-medium text-gray-900">{ins.nombreAlumno}</td>
                        <td className="px-4 py-2 text-sm text-gray-600">${ins.montoPago}</td>
                        <td className="px-4 py-2 text-sm text-gray-600">{ins.semanasPagadas}</td>
                        <td className="px-4 py-2 text-sm text-gray-600">{new Date(ins.fechaInicio).toLocaleDateString()}</td>
                        <td className="px-4 py-2 text-sm text-gray-600">{new Date(ins.fechaFin).toLocaleDateString()}</td>
                        <td className="px-4 py-2 text-right text-sm">
                          <button
                            onClick={() => eliminarInscripcion(ins._id)}
                            className="text-red-600 hover:text-red-800 transition"
                          >
                            <Trash2 className="h-4 w-4 inline" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Formulario de asignación de profesor */}
          {mostrarFormAsignacion && (
            <div className="mt-6">
              <AsignacionProfesorVeranoForm
                cursoId={id!}
                onSuccess={() => {
                  setMostrarFormAsignacion(false);
                  setAsignacionEditando(null);
                  cargarDatos();
                }}
                onCancel={() => {
                  setMostrarFormAsignacion(false);
                  setAsignacionEditando(null);
                }}
                asignacionExistente={asignacionEditando || undefined}
              />
            </div>
          )}

          {/* Formulario de inscripción de alumno */}
          {mostrarFormInscripcion && (
            <div className="mt-6">
              <InscripcionVeranoForm
                cursoId={id!}
                cursoFechaInicio={curso.fechaInicio}
                cursoFechaFin={curso.fechaFin}
                onSuccess={() => {
                  setMostrarFormInscripcion(false);
                  cargarDatos();
                }}
                onCancel={() => setMostrarFormInscripcion(false)}
              />
            </div>
          )}
        </div>
      </div>
    </BackgroundVideo>
  );
}