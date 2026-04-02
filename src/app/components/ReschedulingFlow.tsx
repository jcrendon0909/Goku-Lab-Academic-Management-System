import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { ArrowLeft, Clock, User, AlertCircle, MessageCircle, Check } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Label } from './ui/label';
import { teachers, Teacher } from '../data/mockData';
import { useClasses } from '../context/ClassContext';
import { toast } from 'sonner';

export function ReschedulingFlow() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { classes, rescheduleClass } = useClasses();
  
  const classId = searchParams.get('classId');
  const studentId = searchParams.get('studentId');
  const studentName = searchParams.get('studentName');
  
  const classData = classes.find(c => c.id === classId);

  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedDuration, setSelectedDuration] = useState('2'); // duración por defecto: 2 horas
  const [isConfirming, setIsConfirming] = useState(false);

  // Combinar profesores disponibles + el profesor original de la clase
  const originalTeacher = classData?.teacher;
  let allAvailableTeachers = teachers.filter(t => t.available);
  
  // Agregar el profesor original si no está en la lista de disponibles
  if (originalTeacher && !allAvailableTeachers.find(t => t.id === originalTeacher.id)) {
    allAvailableTeachers = [
      { ...originalTeacher, available: true }, // Marcar como disponible
      ...allAvailableTeachers
    ];
  }

  const unavailableTeachers = teachers.filter(t => 
    !t.available && (!originalTeacher || t.id !== originalTeacher.id)
  );

  const handleSendWhatsApp = () => {
    toast.success('Mensaje grupal de WhatsApp enviado a todos los profesores');
  };

  const handleConfirmReschedule = () => {
    if (!selectedTeacher || !selectedDate || !selectedTime || !classId || !studentId || !studentName) {
      toast.error('Por favor completa todos los campos');
      return;
    }

    setIsConfirming(true);
    
    // Simular proceso de reprogramación
    setTimeout(() => {
      rescheduleClass(classId, studentId, {
        newDate: selectedDate,
        newTime: selectedTime,
        newTeacher: selectedTeacher,
        studentName: studentName,
        duration: parseFloat(selectedDuration),
      });
      
      setIsConfirming(false);
      toast.success('Clase reprogramada exitosamente');
      navigate('/');
    }, 1500);
  };

  if (!classData) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Clase no encontrada</p>
          <Button onClick={() => navigate('/')} className="mt-4">
            Volver al inicio
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="mb-4 -ml-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al panel
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Reprogramación de Clase</h1>
            <p className="text-cyan-600 mt-2 text-lg font-medium">
              Para: {studentName}
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-6">
        {/* Original Class Info */}
        <Card className="p-6 mb-6 rounded-xl shadow-sm bg-gray-50">
          <h2 className="font-semibold text-gray-900 mb-4">Clase Original</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-xs text-gray-500 mb-1">Materia</div>
              <div className="font-medium text-gray-900">{classData.title}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Profesor</div>
              <div className="font-medium text-gray-900">{classData.teacher.name}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Horario Original</div>
              <div className="font-medium text-gray-900">
                {classData.startTime} - {classData.endTime}
              </div>
            </div>
          </div>
        </Card>

        {/* Teacher Selection */}
        <Card className="p-6 mb-6 rounded-xl shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <User className="h-5 w-5 text-gray-700" />
            <h2 className="font-semibold text-gray-900">Disponibilidad de Profesores</h2>
            <Badge variant="outline" className="ml-auto rounded-lg bg-green-50 text-green-700 border-green-200">
              {allAvailableTeachers.length} disponibles
            </Badge>
            <Badge variant="outline" className="rounded-lg bg-red-50 text-red-700 border-red-200">
              {unavailableTeachers.length} no disponibles
            </Badge>
          </div>

          <div className="space-y-3 mb-4">
            {/* Profesores Disponibles */}
            {allAvailableTeachers.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-green-700 mb-2 flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500"></div>
                  Disponibles
                </h3>
                <div className="space-y-2">
                  {allAvailableTeachers.map((teacher) => (
                    <button
                      key={teacher.id}
                      onClick={() => setSelectedTeacher(teacher)}
                      className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                        selectedTeacher?.id === teacher.id
                          ? 'border-cyan-500 bg-cyan-50'
                          : 'border-green-200 hover:border-cyan-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                            <User className="h-5 w-5 text-green-700" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 flex items-center gap-2">
                              {teacher.name}
                              {teacher.id === originalTeacher?.id && (
                                <Badge className="bg-blue-100 text-blue-700 text-xs">
                                  Profesor Original
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-gray-500">{teacher.email}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className="rounded-lg bg-green-100 text-green-700">
                            Disponible
                          </Badge>
                          {selectedTeacher?.id === teacher.id && (
                            <div className="h-6 w-6 rounded-full bg-cyan-500 flex items-center justify-center">
                              <Check className="h-4 w-4 text-white" />
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Profesores No Disponibles */}
            {unavailableTeachers.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-red-700 mb-2 flex items-center gap-2 mt-4">
                  <div className="h-2 w-2 rounded-full bg-red-500"></div>
                  No Disponibles
                </h3>
                <div className="space-y-2">
                  {unavailableTeachers.map((teacher) => (
                    <div
                      key={teacher.id}
                      className="w-full p-4 rounded-lg border-2 border-red-200 bg-gray-50 opacity-75"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                            <User className="h-5 w-5 text-red-700" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{teacher.name}</div>
                            <div className="text-sm text-gray-500">{teacher.email}</div>
                          </div>
                        </div>
                        <Badge className="rounded-lg bg-red-100 text-red-700">
                          No disponible
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* WhatsApp Button - Always visible */}
          <div className="pt-4 border-t border-gray-200">
            {allAvailableTeachers.length === 0 && (
              <Card className="p-4 bg-amber-50 border-amber-200 rounded-lg mb-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-amber-900">Ningún profesor disponible</h3>
                    <p className="text-sm text-amber-800 mt-1">
                      Envía un mensaje grupal para solicitar disponibilidad.
                    </p>
                  </div>
                </div>
              </Card>
            )}
            <Button
              onClick={handleSendWhatsApp}
              className="w-full bg-green-500 hover:bg-green-600 text-white rounded-lg h-12"
            >
              <MessageCircle className="mr-2 h-5 w-5" />
              Enviar Mensaje
            </Button>
          </div>
        </Card>

        {/* Date and Time Selection */}
        {allAvailableTeachers.length > 0 && (
          <Card className="p-6 mb-6 rounded-xl shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="h-5 w-5 text-gray-700" />
              <h2 className="font-semibold text-gray-900">Nueva Fecha, Hora y Duración</h2>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="date" className="text-sm font-medium text-gray-700">
                  Fecha
                </Label>
                <input
                  id="date"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div>
                <Label htmlFor="time" className="text-sm font-medium text-gray-700">
                  Hora de Inicio
                </Label>
                <input
                  id="time"
                  type="time"
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
              <div>
                <Label htmlFor="duration" className="text-sm font-medium text-gray-700">
                  Duración
                </Label>
                <select
                  id="duration"
                  value={selectedDuration}
                  onChange={(e) => setSelectedDuration(e.target.value)}
                  className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white"
                >
                  <option value="0.5">30 minutos</option>
                  <option value="1">1 hora</option>
                  <option value="1.5">1.5 horas</option>
                  <option value="2">2 horas</option>
                  <option value="2.5">2.5 horas</option>
                  <option value="3">3 horas</option>
                  <option value="4">4 horas</option>
                </select>
              </div>
            </div>

            {selectedTeacher && selectedDate && selectedTime && (
              <Card className="mt-4 p-4 bg-green-50 border-green-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-green-600 mt-0.5" />
                  <div className="text-sm text-green-900">
                    <span className="font-medium">Nueva clase programada: </span>
                    {new Date(selectedDate).toLocaleDateString('es-ES', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })} a las {selectedTime} con {selectedTeacher.name}
                    <span className="font-medium"> • Duración: {selectedDuration === '0.5' ? '30 minutos' : selectedDuration === '1' ? '1 hora' : selectedDuration === '1.5' ? '1.5 horas' : `${selectedDuration} horas`}</span>
                  </div>
                </div>
              </Card>
            )}
          </Card>
        )}

        {/* Tracking Info */}
        {allAvailableTeachers.length > 0 && (
          <Card className="p-6 mb-6 rounded-xl shadow-sm bg-amber-50 border-amber-200">
            <h3 className="font-medium text-amber-900 mb-2">Seguimiento de Reprogramación</h3>
            <p className="text-sm text-amber-800">
              Esta clase quedará marcada como "Reprogramado" con una etiqueta visual amarilla
              que incluye el nombre del estudiante ({studentName}) para mantener la trazabilidad
              completa del cambio.
            </p>
          </Card>
        )}

        {/* Confirm Button */}
        {allAvailableTeachers.length > 0 && (
          <Button
            onClick={handleConfirmReschedule}
            disabled={!selectedTeacher || !selectedDate || !selectedTime || isConfirming}
            className="w-full bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg h-14 text-lg font-medium shadow-lg"
          >
            {isConfirming ? (
              <>
                <div className="mr-2 h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Confirmando...
              </>
            ) : (
              <>
                <Check className="mr-2 h-5 w-5" />
                Confirmar Reprogramación
              </>
            )}
          </Button>
        )}
      </main>
    </div>
  );
}