import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import { Calendar, Clock, User, Users, RotateCcw, StickyNote, BookOpen, Pencil, UserPlus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatMexicoTimeRange } from '../../utils/dateUtils';
import { actualizarModalidadReagendacion } from '../../services/api';

interface ClassDetailsDialogProps {
  classData: any;
  isOpen: boolean;
  puedeEditar?: boolean;
  onClose: () => void;
  onReagendar: (student: any) => void;
  onInscribirAlumno: (classData: any) => void;
  onEliminarGrupo: (classData: any) => void;
  onGuardarComentarioGrupo: (classData: any, comentario: string) => Promise<void> | void;
  onEliminarReagendacion: (classData: any) => void;
  onBajaAlumno: (student: any, classData: any) => void;
  onEliminarReagendacionAlumno: (student: any, classData: any) => void;
  onActualizarInscripcion: (
    student: any,
    classData: any,
    datos: { modalidad?: string; comentarios?: string }
  ) => Promise<void>;
}

export function ClassDetailsDialog({
  classData,
  isOpen,
  puedeEditar = true,
  onClose,
  onReagendar,
  onInscribirAlumno,
  onEliminarGrupo,
  onGuardarComentarioGrupo,
  onEliminarReagendacion,
  onBajaAlumno,
  onEliminarReagendacionAlumno,
  onActualizarInscripcion,
}: ClassDetailsDialogProps) {
  const navigate = useNavigate();
  const [comentarioGrupo, setComentarioGrupo] = useState('');
  const [guardandoComentario, setGuardandoComentario] = useState(false);
  const [comentariosPorAlumno, setComentariosPorAlumno] = useState<Record<string, string>>({});
  const [modalidadesPorAlumno, setModalidadesPorAlumno] = useState<Record<string, string>>({});
  const [guardandoComentarioAlumno, setGuardandoComentarioAlumno] = useState<string | null>(null);
  const [cambiandoModalidadAlumno, setCambiandoModalidadAlumno] = useState<string | null>(null);
  const [showAllData, setShowAllData] = useState(false);
  const [actualizandoModalidad, setActualizandoModalidad] = useState<string | null>(null);

  const esReagendada = Boolean(classData?.tipoReagendacionClase);
  const esDestino = classData?.tipoReagendacionClase === 'destino';
  const profesorRequiereAtencion = !classData?.teacher?.name || classData?.profesorActivo === false;

  useEffect(() => {
    if (isOpen && classData) {
      setComentarioGrupo(classData?.comentarioGrupo || '');
      
      const comentariosIniciales: Record<string, string> = {};
      const modalidadesIniciales: Record<string, string> = {};
      
      for (const student of classData?.students || []) {
        if (student?.idAlumno) {
          comentariosIniciales[student.idAlumno] = student.comentarios || '';
          let modalidad = student.modalidad || 'Presencial';
          if (esDestino && classData?.modalidadReagendacion) {
            modalidad = classData.modalidadReagendacion;
          }
          modalidadesIniciales[student.idAlumno] = modalidad;
        }
      }
      setComentariosPorAlumno(comentariosIniciales);
      setModalidadesPorAlumno(modalidadesIniciales);
    }
  }, [isOpen, classData, esDestino]);

  const handleGuardarComentarioGrupo = async () => {
    const comentarioActual = classData?.comentarioGrupo || '';
    if (comentarioGrupo.trim() === comentarioActual.trim()) return;
    try {
      setGuardandoComentario(true);
      await onGuardarComentarioGrupo(classData, comentarioGrupo);
      toast.success('Nota del grupo actualizada');
    } catch (error) {
      toast.error('Error al guardar nota');
    } finally {
      setGuardandoComentario(false);
    }
  };

  const handleGuardarComentarioAlumno = async (student: any) => {
    const comentario = comentariosPorAlumno[student.idAlumno] ?? '';
    if (comentario.trim() === (student.comentarios || '').trim()) return;
    try {
      setGuardandoComentarioAlumno(student.idAlumno);
      await onActualizarInscripcion(student, classData, { comentarios: comentario });
      toast.success('Comentario actualizado');
    } catch (error) {
      toast.error('Error al guardar comentario');
    } finally {
      setGuardandoComentarioAlumno(null);
    }
  };

  const handleCambiarModalidad = async (student: any, modalidad: 'Presencial' | 'Virtual') => {
    const modalidadActual = modalidadesPorAlumno[student.idAlumno] ?? student.modalidad ?? 'Presencial';
    if (modalidadActual === modalidad) return;

    try {
      setActualizandoModalidad(student.idAlumno);
      setCambiandoModalidadAlumno(student.idAlumno);

      if (esDestino) {
        const reagendacionId = student.reagendacion?.reagendacionId;
        if (!reagendacionId) {
          throw new Error('No se encontró el ID de la reagendación para este alumno');
        }
        await actualizarModalidadReagendacion(reagendacionId, modalidad);
      } else {
        await onActualizarInscripcion(student, classData, { modalidad });
      }

      setModalidadesPorAlumno(prev => ({
        ...prev,
        [student.idAlumno]: modalidad,
      }));

      toast.success('Modalidad actualizada');
    } catch (error: any) {
      console.error('Error al cambiar modalidad:', error);
      toast.error(error.message || 'Error al cambiar modalidad');
    } finally {
      setActualizandoModalidad(null);
      setCambiandoModalidadAlumno(null);
    }
  };

  const handleInscribirAlumno = () => {
    navigate(`/alumnos?grupoId=${classData?.idGrupo || classData?.id}&accion=inscribir`);
  };

  const formatearFechaHoraReagendacion = (fechaHoraNueva: string) => {
    const fecha = new Date(fechaHoraNueva);
    if (isNaN(fecha.getTime())) return null;
    const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const dia = dias[fecha.getDay()];
    const fechaStr = fecha.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC'
    });
    const horaStr = fecha.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC'
    });
    return { dia, fechaStr, horaStr };
  };

  const esDestinoReagendado = classData?.tipoReagendacionClase === 'destino' && classData?.fechaHoraNueva;
  const fechaInfo = esDestinoReagendado ? formatearFechaHoraReagendacion(classData.fechaHoraNueva) : null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[98vw] !max-w-[1120px] rounded-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle className="text-2xl font-bold text-gray-900">
                {classData?.title || 'Detalles de la clase'}
              </DialogTitle>
              <DialogDescription className="mt-2">
                Información completa de la clase y acciones disponibles
              </DialogDescription>
            </div>
            <div className="flex flex-col items-end gap-2">
              {classData?.tipoReagendacionClase === 'origen' && (
                <Badge className="bg-yellow-400 text-yellow-900 rounded-lg">Reagendada (origen)</Badge>
              )}
              {classData?.tipoReagendacionClase === 'destino' && (
                <Badge className="bg-sky-300 text-sky-900 rounded-lg">Reagendada (destino)</Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Información general */}
          <Card className="p-4 bg-gray-50 rounded-lg border-none">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-cyan-500" />
                <div>
                  <div className="text-xs text-gray-500">Día</div>
                  <div className="text-sm font-medium text-gray-900">
                    {esDestinoReagendado && fechaInfo
                      ? `${fechaInfo.dia} (${fechaInfo.fechaStr})`
                      : classData?.diaClase || 'Sin día asignado'
                    }
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-cyan-500" />
                <div>
                  <div className="text-xs text-gray-500">Horario</div>
                  <div className="text-sm font-medium text-gray-900">
                    {esDestinoReagendado && fechaInfo
                      ? `${formatMexicoTimeRange(classData.fechaHoraNueva, classData.duracion)}`
                      : `${classData?.startTime} - ${classData?.endTime}`
                    }
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Curso */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="h-5 w-5 text-gray-700" />
              <h3 className="font-semibold text-gray-900">Curso</h3>
            </div>
            <Card className={`p-4 rounded-lg ${classData?.cursoActivo === false ? 'border border-orange-200 bg-orange-50' : ''}`}>
              <div className="flex items-center justify-between">
                <div className={`font-medium ${classData?.cursoActivo === false ? 'text-orange-700' : 'text-gray-900'}`}>
                  {classData?.title || 'Sin curso asignado'}
                </div>
                <Link
                  to="/cursos"
                  className="inline-flex items-center gap-1 text-cyan-500 hover:text-cyan-700 text-sm font-medium"
                >
                  <Pencil className="h-3 w-3" />
                  Gestionar cursos
                </Link>
              </div>
            </Card>
          </div>

          {/* Profesor */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <User className="h-5 w-5 text-gray-700" />
              <h3 className="font-semibold text-gray-900">Profesor Asignado</h3>
            </div>
            <Card className={`p-4 rounded-lg ${profesorRequiereAtencion ? 'border border-red-200 bg-red-50' : ''}`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className={`font-medium ${profesorRequiereAtencion ? 'text-red-700' : 'text-gray-900'}`}>
                    {classData?.teacher?.name || 'Sin profesor asignado'}
                  </div>
                  <div className="text-sm text-gray-500">{classData?.teacher?.email || ''}</div>
                </div>
                <Link
                  to="/profesores"
                  className="inline-flex items-center gap-1 text-cyan-500 hover:text-cyan-700 text-sm font-medium"
                >
                  <Pencil className="h-3 w-3" />
                  Gestionar profesores
                </Link>
              </div>
            </Card>
          </div>

          {/* Notas del grupo */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <StickyNote className="h-5 w-5 text-gray-700" />
              <h3 className="font-semibold text-gray-900">Nota del grupo</h3>
            </div>
            <Card className="p-4 rounded-lg">
              <textarea
                value={comentarioGrupo}
                onChange={(e) => setComentarioGrupo(e.target.value)}
                rows={3}
                placeholder="Agrega una nota para esta clase"
                className="w-full resize-y rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-800 outline-none transition-colors focus:border-cyan-300 focus:bg-white"
                disabled={!puedeEditar}
              />
              {puedeEditar && (
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={handleGuardarComentarioGrupo}
                    disabled={guardandoComentario || comentarioGrupo.trim() === (classData?.comentarioGrupo || '').trim()}
                    className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      guardandoComentario || comentarioGrupo.trim() === (classData?.comentarioGrupo || '').trim()
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-cyan-50 text-cyan-700 border border-cyan-200 hover:bg-cyan-100'
                    }`}
                  >
                    {guardandoComentario ? 'Guardando...' : 'Guardar nota'}
                  </button>
                </div>
              )}
            </Card>
          </div>

          {/* Alumnos matriculados */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-5 w-5 text-gray-700" />
              <h3 className="font-semibold text-gray-900">Alumnos Matriculados</h3>
              <Badge variant="outline" className="rounded-lg">
                {classData?.students?.length || 0}
              </Badge>
            </div>

            {classData?.students && classData.students.length > 0 ? (
              <div className="space-y-3">
                {classData.students.map((student: any, index: number) => {
                  const comentarioEditado = comentariosPorAlumno[student.idAlumno] ?? '';
                  const modalidadActual = modalidadesPorAlumno[student.idAlumno] ?? student.modalidad ?? 'Presencial';
                  const esReagendado = student.reagendacion?.tipo === 'destino';
                  const estaActualizando = actualizandoModalidad === student.idAlumno;

                  return (
                    <Card key={student.idAlumno || index} className="p-4 rounded-xl">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-gray-900">
                              {student.nombreAlumno || 'Sin nombre'}
                            </p>
                            {esReagendado && (
                              <Badge className="bg-blue-400 text-blue-900 rounded-lg">Reagendado</Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-500">{student.idAlumno || ''}</p>

                          {/* Modalidad */}
                          <div className="mt-2">
                            <p className="text-xs text-gray-500 mb-1">Modalidad</p>
                            <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
                              {(['Presencial', 'Virtual'] as const).map((opcion) => (
                                <button
                                  key={opcion}
                                  type="button"
                                  disabled={!puedeEditar || estaActualizando}
                                  onClick={() => handleCambiarModalidad(student, opcion)}
                                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                                    modalidadActual === opcion
                                      ? opcion === 'Virtual'
                                        ? 'bg-purple-600 text-white shadow-sm'
                                        : 'bg-emerald-600 text-white shadow-sm'
                                      : 'text-gray-600 hover:bg-white'
                                  } ${estaActualizando ? 'opacity-60 cursor-wait' : ''}`}
                                >
                                  {opcion}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Comentarios del alumno */}
                          <div className="mt-3">
                            <p className="text-xs text-gray-500 mb-1">Comentarios de inscripción</p>
                            <textarea
                              value={comentarioEditado}
                              onChange={(e) =>
                                setComentariosPorAlumno((prev) => ({
                                  ...prev,
                                  [student.idAlumno]: e.target.value,
                                }))
                              }
                              rows={2}
                              placeholder="Notas sobre este alumno en el grupo"
                              className="w-full resize-y rounded-lg border border-gray-200 bg-gray-50 p-2.5 text-sm text-gray-800 outline-none transition-colors focus:border-cyan-300 focus:bg-white"
                              disabled={!puedeEditar}
                            />
                            {puedeEditar && (
                              <div className="mt-2 flex justify-end">
                                <button
                                  type="button"
                                  onClick={() => handleGuardarComentarioAlumno(student)}
                                  disabled={
                                    guardandoComentarioAlumno === student.idAlumno ||
                                    comentarioEditado.trim() === (student.comentarios || '').trim()
                                  }
                                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                                    guardandoComentarioAlumno === student.idAlumno ||
                                    comentarioEditado.trim() === (student.comentarios || '').trim()
                                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                      : 'bg-cyan-50 text-cyan-700 border border-cyan-200 hover:bg-cyan-100'
                                  }`}
                                >
                                  {guardandoComentarioAlumno === student.idAlumno
                                    ? 'Guardando...'
                                    : 'Guardar comentario'}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Acciones por alumno */}
                        <div className="flex flex-wrap items-center gap-2">
                          {puedeEditar && !student.reagendacion && classData?.tipoReagendacionClase !== 'destino' && (
                            <button
                              onClick={() => onReagendar(student)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-cyan-700 bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 rounded-lg transition-colors"
                              title="Reprogramar alumno"
                            >
                              <RotateCcw className="w-4 h-4" />
                              <span className="hidden sm:inline">Reagendar</span>
                            </button>
                          )}

                          {puedeEditar && classData?.tipoReagendacionClase !== 'destino' && (
                            <button
                              onClick={() => onBajaAlumno(student, classData)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors"
                              title="Inactivar al alumno en este grupo"
                            >
                              <span className="hidden sm:inline">Inactivar</span>
                            </button>
                          )}

                          {puedeEditar && (classData?.tipoReagendacionClase === 'destino' || student.reagendacion?.tipo === 'destino') && (
                            <button
                              onClick={() => onEliminarReagendacionAlumno(student, classData)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors"
                              title="Eliminar esta reagendación temporal"
                            >
                              <RotateCcw className="w-4 h-4" />
                              <span className="hidden sm:inline">Quitar reagendación</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No hay alumnos inscritos.</p>
            )}
          </div>

          {/* Acciones generales del grupo (solo para admin) */}
          {puedeEditar && !esReagendada && (
            <div className="flex flex-wrap gap-3 pt-2 border-t border-gray-200">
              <button
                onClick={handleInscribirAlumno}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                Inscribir alumno
              </button>
              <button
                onClick={() => onEliminarGrupo(classData)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Eliminar grupo
              </button>
              {classData?.tipoReagendacionClase === 'destino' && (
                <button
                  onClick={() => onEliminarReagendacion(classData)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  Eliminar reagendación
                </button>
              )}
            </div>
          )}

          {/* ============================================================ */}
          {/* NUEVA SECCIÓN: DETALLES TÉCNICOS CON FORMATO BONITO */}
          {/* ============================================================ */}
          <div className="pt-4 border-t border-gray-200">
            <button
              onClick={() => setShowAllData(!showAllData)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg transition-colors"
            >
              {showAllData ? 'Ocultar' : 'Ver'} detalles técnicos de la reagendación
            </button>

            {showAllData && (
              <div className="mt-4 p-4 bg-white rounded-xl border border-gray-200 shadow-sm space-y-4">
                {/* Título */}
                <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <span className="w-1 h-6 bg-[#26AAA3] rounded-full"></span>
                  Información completa de la reagendación
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Clase Original */}
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center gap-2 text-gray-600 text-xs font-medium uppercase tracking-wider mb-3">
                      <Clock className="w-4 h-4" />
                      Clase Original
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Profesor:</span>
                        <span className="font-medium text-gray-800">
                          {classData?.students?.[0]?.reagendacion?.idProfesorOriginal 
                            ? classData.students[0].reagendacion.idProfesorOriginal 
                            : classData?.idProfesor || 'No asignado'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Fecha original:</span>
                        <span className="font-medium text-gray-800">
                          {classData?.students?.[0]?.reagendacion?.fechaHoraOriginal 
                            ? new Date(classData.students[0].reagendacion.fechaHoraOriginal).toLocaleString('es-MX', {
                                timeZone: 'America/Mexico_City',
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : 'Sin fecha'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Hora original:</span>
                        <span className="font-medium text-gray-800">
                          {classData?.students?.[0]?.reagendacion?.horaClaseOriginal || 'No disponible'}
                        </span>
                      </div>
                      {classData?.idGrupo && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Grupo origen:</span>
                          <span className="font-mono text-xs bg-gray-200 px-2 py-0.5 rounded">
                            {classData.idGrupo}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Clase Reagendada (Destino) */}
                  <div className="bg-[#f0f9ff] rounded-lg p-4 border border-[#26AAA3] border-opacity-30">
                    <div className="flex items-center gap-2 text-[#26AAA3] text-xs font-medium uppercase tracking-wider mb-3">
                      <Calendar className="w-4 h-4" />
                      Clase Reagendada
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Profesor nuevo:</span>
                        <span className="font-medium text-gray-800">
                          {classData?.profesor || classData?.teacher?.name || 'Sin asignar'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Nueva fecha:</span>
                        <span className="font-medium text-gray-800">
                          {classData?.fechaHoraNueva 
                            ? new Date(classData.fechaHoraNueva).toLocaleString('es-MX', {
                                timeZone: 'America/Mexico_City',
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : classData?.fecha || 'Sin fecha'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Horario:</span>
                        <span className="font-medium text-gray-800">
                          {classData?.horaInicio} - {classData?.horaFin || 'Fin por definir'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500">Modalidad:</span>
                        <span className={`text-xs px-3 py-1 rounded-full font-semibold ${
                          classData?.modalidad === 'Virtual' 
                            ? 'bg-purple-600 text-white' 
                            : 'bg-emerald-600 text-white'
                        }`}>
                          {classData?.modalidad || 'Presencial'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Estatus y Comentarios */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-500">Estatus:</span>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                      {classData?.estatus || 'Reagendado'}
                    </span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-sm text-gray-500 whitespace-nowrap">Comentario:</span>
                    <span className="text-sm text-gray-700 italic">
                      {classData?.students?.[0]?.reagendacion?.comentario || 'Sin comentario'}
                    </span>
                  </div>
                </div>

                {/* IDs técnicos (opcional, en pequeño) */}
                <div className="text-xs text-gray-400 border-t border-gray-100 pt-3 flex flex-wrap gap-4">
                  {classData?.id && (
                    <span><span className="font-mono">ID clase:</span> {classData.id}</span>
                  )}
                  {classData?.students?.[0]?.reagendacion?.reagendacionId && (
                    <span><span className="font-mono">ID reagendación:</span> {classData.students[0].reagendacion.reagendacionId}</span>
                  )}
                  {classData?.idGrupo && (
                    <span><span className="font-mono">ID grupo:</span> {classData.idGrupo}</span>
                  )}
                  {classData?.studentId && (
                    <span><span className="font-mono">ID alumno:</span> {classData.studentId}</span>
                  )}
                </div>
              </div>
            )}
          </div>
          {/* ============================================================ */}
          {/* FIN DE LA NUEVA SECCIÓN */}
          {/* ============================================================ */}
        </div>
      </DialogContent>
    </Dialog>
  );
}