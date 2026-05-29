import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import { Calendar, Clock, User, Users, RotateCcw, Trash2, StickyNote, BookOpen } from 'lucide-react';
import { resolverGrupoIdInscripcion } from '../../utils/grupoInscripcion';
import {
  getProfesores,
  reasignarProfesorGrupo,
  getCursos,
  reasignarCursoGrupo,
} from '../../services/api';
import { toast } from 'sonner';

interface ClassDetailsDialogProps {
  classData: any;
  isOpen: boolean;
  /** Si es false, el diálogo es solo lectura (perfil profesor) */
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
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const teacherAvailable =
    classData?.teacher?.available !== undefined
      ? classData.teacher.available
      : false;

  const profesorRequiereAtencion =
    !classData?.teacher?.name || classData?.profesorActivo === false;

  const esReagendada = Boolean(classData?.tipoReagendacionClase);
  const [comentarioGrupo, setComentarioGrupo] = useState('');
  const [guardandoComentario, setGuardandoComentario] = useState(false);
  const [comentariosPorAlumno, setComentariosPorAlumno] = useState<
    Record<string, string>
  >({});
  const [guardandoComentarioAlumno, setGuardandoComentarioAlumno] = useState<
    string | null
  >(null);
  const [cambiandoModalidadAlumno, setCambiandoModalidadAlumno] = useState<
    string | null
  >(null);
  const [profesores, setProfesores] = useState<any[]>([]);
  const [profesorSeleccionado, setProfesorSeleccionado] = useState('');
  const [reasignandoProfesor, setReasignandoProfesor] = useState(false);
  const [cursos, setCursos] = useState<any[]>([]);
  const [cursoSeleccionado, setCursoSeleccionado] = useState('');
  const [reasignandoCurso, setReasignandoCurso] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setComentarioGrupo(classData?.comentarioGrupo || '');
      const inicial: Record<string, string> = {};
      for (const student of classData?.students || []) {
        if (student?.idAlumno) {
          inicial[student.idAlumno] = student.comentarios || '';
        }
      }
      setComentariosPorAlumno(inicial);
      setProfesorSeleccionado(classData?.idProfesor || '');
      setCursoSeleccionado(classData?.idCurso || '');
    }
  }, [classData?.id, classData?.comentarioGrupo, classData?.students, classData?.idProfesor, classData?.idCurso, isOpen]);

  // Cargar catálogos activos (solo para reasignar, no en reagendadas)
  useEffect(() => {
    if (!isOpen || !puedeEditar || esReagendada) return;
    let cancelado = false;
    const soloActivos = (data: any[]) =>
      (data || []).filter(
        (x) => String(x.estatus || 'Activo').toLowerCase() === 'activo'
      );
    getProfesores()
      .then((data: any[]) => {
        if (!cancelado) setProfesores(soloActivos(data));
      })
      .catch(() => setProfesores([]));
    getCursos()
      .then((data: any[]) => {
        if (!cancelado) setCursos(soloActivos(data));
      })
      .catch(() => setCursos([]));
    return () => {
      cancelado = true;
    };
  }, [isOpen, puedeEditar, esReagendada]);

  const handleReasignarProfesor = async () => {
    const idGrupo = classData?.idGrupo;
    if (!idGrupo) return;
    setReasignandoProfesor(true);
    try {
      await reasignarProfesorGrupo(idGrupo, profesorSeleccionado);
      toast.success(
        profesorSeleccionado
          ? 'Profesor asignado correctamente'
          : 'Grupo dejado sin profesor asignado'
      );
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Error al asignar el profesor');
    } finally {
      setReasignandoProfesor(false);
    }
  };

  const handleReasignarCurso = async () => {
    const idGrupo = classData?.idGrupo;
    if (!idGrupo || !cursoSeleccionado) return;
    setReasignandoCurso(true);
    try {
      await reasignarCursoGrupo(idGrupo, cursoSeleccionado);
      toast.success('Curso asignado correctamente');
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Error al asignar el curso');
    } finally {
      setReasignandoCurso(false);
    }
  };

  const grupoIdInscripcionDe = (student: any) =>
    resolverGrupoIdInscripcion(student, classData);

  const handleCambiarModalidad = async (
    student: any,
    modalidad: 'Presencial' | 'Virtual'
  ) => {
    const grupoId = grupoIdInscripcionDe(student);
    if (!student?.idAlumno || !grupoId) return;
    if (student.modalidad === modalidad) return;

    try {
      setCambiandoModalidadAlumno(student.idAlumno);
      await onActualizarInscripcion(student, classData, { modalidad });
    } finally {
      setCambiandoModalidadAlumno(null);
    }
  };

  const handleGuardarComentarioAlumno = async (student: any) => {
    const grupoId = grupoIdInscripcionDe(student);
    if (!student?.idAlumno || !grupoId) return;

    const comentarios = comentariosPorAlumno[student.idAlumno] ?? '';
    const guardado = String(student.comentarios || '').trim();

    if (comentarios.trim() === guardado) return;

    try {
      setGuardandoComentarioAlumno(student.idAlumno);
      await onActualizarInscripcion(student, classData, { comentarios });
    } finally {
      setGuardandoComentarioAlumno(null);
    }
  };

  const handleGuardarComentarioGrupo = async () => {
    try {
      setGuardandoComentario(true);
      await onGuardarComentarioGrupo(classData, comentarioGrupo);
    } finally {
      setGuardandoComentario(false);
    }
  };

  const comentarioGrupoActual = classData?.comentarioGrupo || '';
  const comentarioGrupoSinCambios =
    comentarioGrupo.trim() === String(comentarioGrupoActual).trim();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[98vw] !max-w-[1120px] rounded-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle className="text-2xl font-bold text-gray-900">
                {classData.title}
              </DialogTitle>
              <DialogDescription className="mt-2">
                Detalles completos de la clase programada
              </DialogDescription>
            </div>

            <div className="flex flex-col items-end gap-2">
              <div className="flex gap-2">
                {classData.tipoReagendacionClase === 'origen' && (
                  <Badge className="bg-yellow-400 text-yellow-900 rounded-lg">
                    RP
                  </Badge>
                )}

                {classData.tipoReagendacionClase === 'destino' && (
                  <Badge className="bg-sky-300 text-sky-900 rounded-lg">
                    RP
                  </Badge>
                )}
              </div>

              {puedeEditar && !esReagendada && (
                <>
                  <button
                    onClick={() => onInscribirAlumno(classData)}
                    className="border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100 rounded-lg w-full transition-colors"
                  >
                    Inscribir alumno
                  </button>

                  <button
                    onClick={() => onEliminarGrupo(classData)}
                    className="border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100 rounded-lg w-full transition-colors"
                  >
                    Eliminar grupo
                  </button>
                </>
              )}

              {puedeEditar && classData.tipoReagendacionClase === 'destino' && (
                <button
                  onClick={() => onEliminarReagendacion(classData)}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm w-full"
                >
                  Eliminar reagendación
                </button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          <Card className="p-4 bg-gray-50 rounded-lg border-none">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-cyan-500" />
                <div>
                  <div className="text-xs text-gray-500">Fecha</div>
                  <div className="text-sm font-medium text-gray-900">
                    {formatDate(classData.date)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-cyan-500" />
                <div>
                  <div className="text-xs text-gray-500">Horario</div>
                  <div className="text-sm font-medium text-gray-900">
                    {classData.startTime} - {classData.endTime}
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="h-5 w-5 text-gray-700" />
              <h3 className="font-semibold text-gray-900">Curso</h3>
            </div>

            <Card
              className={`p-4 rounded-lg ${
                classData.cursoActivo === false
                  ? 'border border-orange-200 bg-orange-50'
                  : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div
                  className={`font-medium ${
                    classData.cursoActivo === false
                      ? 'text-orange-700'
                      : 'text-gray-900'
                  }`}
                >
                  {classData.title || 'Sin curso asignado'}
                </div>

                {classData.cursoActivo === false && (
                  <Badge className="rounded-lg bg-orange-600 text-white">
                    {classData.title &&
                    classData.title !== 'Sin curso asignado'
                      ? 'Curso inactivo'
                      : 'Requiere curso'}
                  </Badge>
                )}
              </div>

              {puedeEditar && !esReagendada && (
                <div className="mt-4 border-t border-gray-100 pt-3">
                  <p className="mb-2 text-xs font-semibold text-gray-500">
                    Cambiar curso
                  </p>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <select
                      value={cursoSeleccionado}
                      onChange={(e) => setCursoSeleccionado(e.target.value)}
                      className="h-10 flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-800 outline-none focus:border-cyan-300 focus:bg-white"
                    >
                      <option value="">Selecciona un curso</option>
                      {cursos.map((curso) => (
                        <option key={curso.idCurso} value={curso.idCurso}>
                          {curso.nombreCurso}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleReasignarCurso}
                      disabled={
                        reasignandoCurso ||
                        !cursoSeleccionado ||
                        cursoSeleccionado === (classData?.idCurso || '')
                      }
                      className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                        reasignandoCurso ||
                        !cursoSeleccionado ||
                        cursoSeleccionado === (classData?.idCurso || '')
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-cyan-600 text-white hover:bg-cyan-700'
                      }`}
                    >
                      {reasignandoCurso ? 'Guardando...' : 'Guardar'}
                    </button>
                  </div>
                </div>
              )}
            </Card>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <StickyNote className="h-5 w-5 text-gray-700" />
              <h3 className="font-semibold text-gray-900">Nota del grupo</h3>
            </div>

            <Card className="p-4 rounded-lg">
              {puedeEditar ? (
                <>
                  <textarea
                    value={comentarioGrupo}
                    onChange={(event) => setComentarioGrupo(event.target.value)}
                    rows={3}
                    placeholder="Agrega una nota para esta clase"
                    className="w-full resize-y rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-800 outline-none transition-colors focus:border-cyan-300 focus:bg-white"
                  />

                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={handleGuardarComentarioGrupo}
                      disabled={guardandoComentario || comentarioGrupoSinCambios}
                      className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        guardandoComentario || comentarioGrupoSinCambios
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-cyan-50 text-cyan-700 border border-cyan-200 hover:bg-cyan-100'
                      }`}
                    >
                      {guardandoComentario ? 'Guardando...' : 'Guardar nota'}
                    </button>
                  </div>
                </>
              ) : (
                <p className="whitespace-pre-wrap text-sm text-gray-700">
                  {comentarioGrupo?.trim()
                    ? comentarioGrupo
                    : 'Sin notas para esta clase.'}
                </p>
              )}
            </Card>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <User className="h-5 w-5 text-gray-700" />
              <h3 className="font-semibold text-gray-900">Profesor Asignado</h3>
            </div>

            <Card
              className={`p-4 rounded-lg ${
                profesorRequiereAtencion ? 'border border-red-200 bg-red-50' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div
                    className={`font-medium ${
                      profesorRequiereAtencion ? 'text-red-700' : 'text-gray-900'
                    }`}
                  >
                    {classData.teacher?.name || 'Sin profesor asignado'}
                  </div>
                  <div className="text-sm text-gray-500">
                    {classData.teacher?.email || ''}
                  </div>
                </div>

                {!classData.teacher?.name ? (
                  <Badge className="rounded-lg bg-red-600 text-white">
                    Requiere asignación
                  </Badge>
                ) : classData.profesorActivo === false ? (
                  <Badge className="rounded-lg bg-red-600 text-white">
                    Profesor inactivo
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className={`rounded-lg ${
                      teacherAvailable
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : 'bg-red-50 text-red-700 border-red-200'
                    }`}
                  >
                    {teacherAvailable ? 'Disponible' : 'No disponible'}
                  </Badge>
                )}
              </div>

              {puedeEditar && !esReagendada && (
                <div className="mt-4 border-t border-gray-100 pt-3">
                  <p className="mb-2 text-xs font-semibold text-gray-500">
                    {classData.teacher?.name
                      ? 'Cambiar profesor'
                      : 'Asignar profesor'}
                  </p>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <select
                      value={profesorSeleccionado}
                      onChange={(e) => setProfesorSeleccionado(e.target.value)}
                      className="h-10 flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-800 outline-none focus:border-cyan-300 focus:bg-white"
                    >
                      <option value="">Sin profesor asignado</option>
                      {profesores.map((prof) => (
                        <option key={prof.idProfesor} value={prof.idProfesor}>
                          {prof.nombre}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleReasignarProfesor}
                      disabled={
                        reasignandoProfesor ||
                        profesorSeleccionado === (classData?.idProfesor || '')
                      }
                      className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                        reasignandoProfesor ||
                        profesorSeleccionado === (classData?.idProfesor || '')
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-cyan-600 text-white hover:bg-cyan-700'
                      }`}
                    >
                      {reasignandoProfesor ? 'Guardando...' : 'Guardar'}
                    </button>
                  </div>
                </div>
              )}
            </Card>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-5 w-5 text-gray-700" />
              <h3 className="font-semibold text-gray-900">Alumnos Matriculados</h3>
              <Badge variant="outline" className="rounded-lg">
                {classData.students?.length || 0}
              </Badge>
            </div>

            {classData.students && classData.students.length > 0 ? (
              <div className="space-y-3">
                {classData.students.map((student: any, index: number) => {
                  const puedeEditarInscripcion = Boolean(
                    puedeEditar && student.idAlumno && grupoIdInscripcionDe(student)
                  );
                  const comentarioEditado =
                    comentariosPorAlumno[student.idAlumno] ?? '';
                  const comentarioSinCambios =
                    comentarioEditado.trim() ===
                    String(student.comentarios || '').trim();
                  const modalidadActual = student.modalidad || 'Presencial';

                  return (
                  <Card key={student.idAlumno || index} className="p-4 rounded-xl">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-gray-900">
                            {student.nombreAlumno || 'Sin nombre'}
                          </p>

                          {student.reagendacion?.tipo === 'origen' && (
                            <Badge className="bg-yellow-400 text-yellow-900 rounded-lg">
                              Reagendada (origen)
                            </Badge>
                          )}

                          {student.reagendacion?.tipo === 'destino' && (
                            <Badge className="bg-blue-400 text-blue-900 rounded-lg">
                              Reagendada (destino)
                            </Badge>
                          )}
                        </div>

                        <p className="text-sm text-gray-500">
                          {student.idAlumno || ''}
                        </p>

                        {puedeEditarInscripcion && (
                          <div className="mt-3">
                            <p className="text-xs text-gray-500 mb-1.5">Modalidad</p>
                            <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
                              {(['Presencial', 'Virtual'] as const).map((opcion) => {
                                const activa = modalidadActual === opcion;
                                const cargando =
                                  cambiandoModalidadAlumno === student.idAlumno;

                                return (
                                  <button
                                    key={opcion}
                                    type="button"
                                    disabled={cargando}
                                    onClick={() =>
                                      handleCambiarModalidad(student, opcion)
                                    }
                                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                                      activa
                                        ? opcion === 'Virtual'
                                          ? 'bg-purple-600 text-white shadow-sm'
                                          : 'bg-emerald-600 text-white shadow-sm'
                                        : 'text-gray-600 hover:bg-white'
                                    } ${cargando ? 'opacity-60 cursor-wait' : ''}`}
                                  >
                                    {opcion}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {puedeEditarInscripcion && (
                          <div className="mt-3">
                            <p className="text-xs text-gray-500 mb-1.5">
                              Comentarios de inscripción
                            </p>
                            <textarea
                              value={comentarioEditado}
                              onChange={(event) =>
                                setComentariosPorAlumno((prev) => ({
                                  ...prev,
                                  [student.idAlumno]: event.target.value,
                                }))
                              }
                              rows={2}
                              placeholder="Notas sobre este alumno en el grupo"
                              className="w-full resize-y rounded-lg border border-gray-200 bg-gray-50 p-2.5 text-sm text-gray-800 outline-none transition-colors focus:border-cyan-300 focus:bg-white"
                            />
                            <div className="mt-2 flex justify-end">
                              <button
                                type="button"
                                onClick={() =>
                                  handleGuardarComentarioAlumno(student)
                                }
                                disabled={
                                  guardandoComentarioAlumno ===
                                    student.idAlumno || comentarioSinCambios
                                }
                                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                                  guardandoComentarioAlumno ===
                                    student.idAlumno || comentarioSinCambios
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    : 'bg-cyan-50 text-cyan-700 border border-cyan-200 hover:bg-cyan-100'
                                }`}
                              >
                                {guardandoComentarioAlumno === student.idAlumno
                                  ? 'Guardando...'
                                  : 'Guardar comentario'}
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Vista de solo lectura (perfil profesor): modalidad y notas */}
                        {!puedeEditar && student.idAlumno && (
                          <div className="mt-3 space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">Modalidad:</span>
                              <Badge
                                variant="outline"
                                className={`rounded-lg ${
                                  modalidadActual === 'Virtual'
                                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                }`}
                              >
                                {modalidadActual}
                              </Badge>
                            </div>

                            {String(student.comentarios || '').trim() && (
                              <div>
                                <p className="text-xs text-gray-500 mb-1">
                                  Notas del alumno
                                </p>
                                <p className="whitespace-pre-wrap rounded-lg bg-gray-50 p-2.5 text-sm text-gray-700">
                                  {student.comentarios}
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        {student.reagendacion?.texto && (
                          <p className="text-sm text-gray-500 mt-1">
                            {student.reagendacion.texto}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 justify-end">
                        {/* Reprogramar: solo en clases fijas y si el alumno no tiene reagendación */}
                        {puedeEditar && !student.reagendacion &&
                          classData.tipoReagendacionClase !== 'destino' && (
                          <button
                            onClick={() => onReagendar(student)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-cyan-700 bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 rounded-lg transition-colors"
                            title="Reprogramar alumno"
                          >
                            <RotateCcw className="w-4 h-4" />
                            <span className="hidden sm:inline">Reprogramar</span>
                          </button>
                        )}

                        {/* Inactivar: solo clases fijas (no clases reagendadas destino) */}
                        {puedeEditar &&
                          classData.tipoReagendacionClase !== 'destino' &&
                          student.reagendacion?.tipo !== 'destino' && (
                          <button
                            onClick={() => onBajaAlumno(student, classData)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors"
                            title="Inactivar al alumno en este grupo"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span className="hidden sm:inline">Inactivar en grupo</span>
                          </button>
                        )}

                        {/* Clase reagendada (destino): quitar reprogramación temporal */}
                        {puedeEditar &&
                          (classData.tipoReagendacionClase === 'destino' ||
                          student.reagendacion?.tipo === 'destino') && (
                          <button
                            onClick={() =>
                              onEliminarReagendacionAlumno(student, classData)
                            }
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
