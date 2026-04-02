import { useNavigate } from 'react-router';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import { Calendar, Clock, User, Users } from 'lucide-react';
import { Class } from '../data/mockData';

interface ClassDetailsDialogProps {
  classData: any;
  isOpen: boolean;
  onClose: () => void;
  onReagendar: (student: any) => void;
}

export function ClassDetailsDialog({ classData, isOpen, onClose, onReagendar}: ClassDetailsDialogProps) {
  const navigate = useNavigate();



  const handleReschedule = (studentId: string, studentName: string) => {
    navigate(`/reschedule?classId=${classData.id}&studentId=${studentId}&studentName=${encodeURIComponent(studentName)}`);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl rounded-xl">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold text-gray-900">
                {classData.title}
              </DialogTitle>
              <DialogDescription className="mt-2">
                Detalles completos de la clase programada
              </DialogDescription>
            </div>
            {classData.status === 'rescheduled' && (
              <Badge className="bg-amber-400 text-amber-900 rounded-lg">
                Reprogramado
              </Badge>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Class Info */}
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

          {/* Teacher Info */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <User className="h-5 w-5 text-gray-700" />
              <h3 className="font-semibold text-gray-900">Profesor Asignado</h3>
            </div>
            <Card className="p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900">{classData.teacher.name}</div>
                  <div className="text-sm text-gray-500">{classData.teacher.email}</div>
                </div>
                <Badge
                  variant="outline"
                  className={`rounded-lg ${
                    classData.teacher.available
                      ? 'bg-green-50 text-green-700 border-green-200'
                      : 'bg-red-50 text-red-700 border-red-200'
                  }`}
                >
                  {classData.teacher.available ? 'Disponible' : 'No disponible'}
                </Badge>
              </div>
            </Card>
          </div>

          {/* Students List */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-5 w-5 text-gray-700" />
              <h3 className="font-semibold text-gray-900">Alumnos Matriculados</h3>
              <Badge variant="outline" className="rounded-lg">
                {classData.students.length}
              </Badge>
            </div>
            <div className="space-y-2">


            {classData.students && classData.students.length > 0 ? (
              <div className="space-y-3">
                {classData.students.map((student: any, index: number) => (
                  <div
                    key={index}
                    className="flex items-center justify-between border rounded-xl p-4"
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        {student.nombreAlumno || 'Sin nombre'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {student.idAlumno || ''}
                      </p>
                    </div>

                    <button
                      onClick={() => onReagendar(student)}
                      className="bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded-lg"
                    >
                      Reprogramar
                    </button>                    



                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No hay alumnos inscritos.</p>
            )}

              
            </div>
          </div>

          {classData.status === 'rescheduled' && classData.rescheduledBy && (
            <Card className="p-4 bg-amber-50 border-amber-200 rounded-lg">
              <div className="text-sm">
                <span className="font-medium text-amber-900">Reprogramado por: </span>
                <span className="text-amber-800">{classData.rescheduledBy}</span>
              </div>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
