import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import { Calendar, Clock, User, Users, RotateCcw, X, Trash2 } from 'lucide-react';

interface ClassDetailsDialogProps {
  classData: any;
  isOpen: boolean;
  onClose: () => void;
  onReagendar: (student: any) => void;
  onInscribirAlumno: (classData: any) => void;
  onEliminarGrupo: (classData: any) => void;
  onEliminarReagendacion: (classData: any) => void;
  onBajaAlumno: (student: any, classData: any) => void;
  onEliminarReagendacionAlumno: (student: any, classData: any) => void;
}

export function ClassDetailsDialog({
  classData,
  isOpen,
  onClose,
  onReagendar,
  onInscribirAlumno,
  onEliminarGrupo,
  onEliminarReagendacion,
  onBajaAlumno,
  onEliminarReagendacionAlumno,
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

  const esReagendada = Boolean(classData?.tipoReagendacionClase);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[96vw] max-w-7xl rounded-xl max-h-[90vh] overflow-y-auto">
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

              {!esReagendada && (
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

              {classData.tipoReagendacionClase === 'destino' && (
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
              <User className="h-5 w-5 text-gray-700" />
              <h3 className="font-semibold text-gray-900">Profesor Asignado</h3>
            </div>

            <Card className="p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900">
                    {classData.teacher?.name || 'Sin profesor asignado'}
                  </div>
                  <div className="text-sm text-gray-500">
                    {classData.teacher?.email || ''}
                  </div>
                </div>

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
              </div>
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
                {classData.students.map((student: any, index: number) => (
                  <Card key={index} className="p-4 rounded-xl">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-gray-900">
                            {student.nombreAlumno || 'Sin nombre'}
                          </p>

                          <Badge 
                            variant="outline" 
                            className={`rounded-lg ${
                              student.modalidad === 'Virtual' 
                                ? 'bg-purple-50 text-purple-700 border-purple-200' 
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}
                          >
                            {student.modalidad || 'Presencial'}
                          </Badge>

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

                        {student.comentarios && (
                          <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-600">
                            <span className="rounded-lg bg-gray-50 border border-gray-200 px-2 py-1 max-w-full">
                              Comentarios: {student.comentarios}
                            </span>
                          </div>
                        )}

                        {student.reagendacion?.texto && (
                          <p className="text-sm text-gray-500 mt-1">
                            {student.reagendacion.texto}
                          </p>
                        )}

                        {student.reagendacion?.comentario && (
                          <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-600">
                            <span className="rounded-lg bg-yellow-50 border border-yellow-200 px-2 py-1 max-w-full">
                              Comentario de reagendacion: {student.reagendacion.comentario}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 justify-end">
                        {/* Reprogramar: solo si el alumno NO tiene reagendación */}
                        {!student.reagendacion && (
                          <button
                            onClick={() => onReagendar(student)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-cyan-700 bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 rounded-lg transition-colors"
                            title="Reprogramar alumno"
                          >
                            <RotateCcw className="w-4 h-4" />
                            <span className="hidden sm:inline">Reprogramar</span>
                          </button>
                        )}

                        <button
                          onClick={() => onBajaAlumno(student, classData)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors"
                          title="Dar de baja al alumno"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span className="hidden sm:inline">Dar de baja</span>
                        </button>
                      </div>
                    </div>
                  </Card>
                ))}
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
