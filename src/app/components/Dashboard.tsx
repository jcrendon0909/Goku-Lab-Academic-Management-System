
import { useEffect, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  RefreshCw,
} from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { ClassDetailsDialog } from './ClassDetailsDialog';
import { getCalendario } from '../../services/api';

import { toast } from 'sonner';
import ReagendacionForm from './ReagendacionForm';

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTHS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

interface StudentItem {
  idAlumno: string;
  nombreAlumno: string;
  reagendacion?: {
    tipo: 'origen' | 'destino';
    texto: string;
  } | null;
}

interface CalendarClass {
  id: string;
  title: string;
  date: Date;
  startTime: string;
  endTime: string;
  teacher: {
    name: string;
    email: string;
  };
  students: StudentItem[];
  color: string;
  status: 'scheduled' | 'rescheduled-origin' | 'rescheduled-destination';
  tipoReagendacionClase?: 'origen' | 'destino' | null;

  esReagendacion?: boolean;
  reagendacionId?: string;
  fechaHoraOriginal?: string;
  fechaHoraNueva?: string;
  fechaEspecifica?: string;
  idGrupo?: string;
}

function obtenerFechasDelDiaEnMes(
  diaClase: string,
  year: number,
  month: number
) {
  const diasMap: Record<string, number> = {
    Domingo: 0,
    Dom: 0,
    Lunes: 1,
    Lun: 1,
    Martes: 2,
    Mar: 2,
    Miércoles: 3,
    Miercoles: 3,
    Mié: 3,
    Jueves: 4,
    Jue: 4,
    Viernes: 5,
    Vie: 5,
    Sábado: 6,
    Sabado: 6,
    Sáb: 6,
  };

  const targetDay = diasMap[diaClase];
  if (targetDay === undefined) return [];

  const fechas: Date[] = [];
  const lastDay = new Date(year, month + 1, 0).getDate();

  for (let day = 1; day <= lastDay; day++) {
    const fecha = new Date(year, month, day);
    if (fecha.getDay() === targetDay) {
      fechas.push(fecha);
    }
  }

  return fechas;
}

function calcularHoraFin(horaInicio: string) {
  if (!horaInicio) return '';

  const [h, m] = horaInicio.split(':').map(Number);
  const fecha = new Date();
  fecha.setHours(h, m + 120);

  return `${fecha.getHours().toString().padStart(2, '0')}:${fecha
    .getMinutes()
    .toString()
    .padStart(2, '0')}`;
}

function obtenerColorPorCurso(curso: string) {
  const colores: Record<string, string> = {
    'Programación Visual': '#06b6d4',
    'Diseño de Videojuegos': '#ec4899',
    'Python Star': '#10b981',
    'Java Scripts': '#f59e0b',
    JavaScript: '#f59e0b',
    'Robótica 26-1 (Torneo)': '#ef4444',
    Robótica: '#ef4444',
    'Alfabetización Digital': '#8b5cf6',
    Matemáticas: '#3b82f6',
    Inglés: '#3b82f6',
    'Diseño Gráfico': '#3b82f6',
  };

  return colores[curso] || '#3b82f6';
}

function obtenerColorEvento(item: any) {
  if (item.esReagendacion) {
    return '#f97316';
  }

  return obtenerColorPorCurso(item.nombreCurso);
}

export function Dashboard() {
  const [classes, setClasses] = useState<CalendarClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentDate, setCurrentDate] = useState(new Date(2026, 2, 1));
  const [view, setView] = useState<'month' | 'day'>('month');
  const [selectedClass, setSelectedClass] = useState<CalendarClass | null>(null);
  const [reagendacionData, setReagendacionData] = useState<any>(null);
  const [showReagendacion, setShowReagendacion] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleReagendar = (student: any) => {
    setReagendacionData({
      alumno: student,
      clase: selectedClass,
    });

    setShowReagendacion(true);
  };

  useEffect(() => {
    const fetchCalendario = async () => {
      try {
        setLoading(true);
        setError('');

        const data = await getCalendario();

        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
//////////////////////////////////////////////////////////////////////////////////////

        const clasesBase = data.clasesBase || [];
        const reagendaciones = data.reagendaciones || [];

        const transformedBase: CalendarClass[] = clasesBase.reduce(
          (acc: CalendarClass[], item: any) => {
            const fechas = obtenerFechasDelDiaEnMes(item.diaClase, year, month);

            const eventos: CalendarClass[] = fechas.map((fecha, index) => {
              const fechaEvento = new Date(fecha);
              const horaInicio = item.horaClase || '';

              const studentsFiltrados = (item.alumnos || []).map((alumno: any) => {
                if (!alumno.reagendacion) {
                  return { ...alumno, reagendacion: null };
                }

                const reag = alumno.reagendacion;
                const fechaOriginal = reag.fechaHoraOriginal
                  ? new Date(reag.fechaHoraOriginal)
                  : null;

                const mismaFechaOriginal =
                  reag.tipo === 'origen' &&
                  fechaOriginal &&
                  fechaOriginal.getFullYear() === fechaEvento.getFullYear() &&
                  fechaOriginal.getMonth() === fechaEvento.getMonth() &&
                  fechaOriginal.getDate() === fechaEvento.getDate();

                if (mismaFechaOriginal) {
                  const fechaNueva = reag.fechaHoraNueva ? new Date(reag.fechaHoraNueva) : null;

                  return {
                    ...alumno,
                    reagendacion: {
                      tipo: 'origen',
                      texto: fechaNueva
                        ? `Nuevo horario: ${fechaNueva.toLocaleDateString('es-MX', {
                            weekday: 'short',
                          })} ${reag.horaClaseNueva || fechaNueva.toLocaleTimeString('es-MX', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false,
                          })}`
                        : '',
                    },
                  };
                }

                return { ...alumno, reagendacion: null };
              });

              const tieneOrigen = studentsFiltrados.some(
                (alumno: any) => alumno.reagendacion?.tipo === 'origen'
              );

              return {
                id: `${item.idGrupo}-${index}`,
                title: item.nombreCurso,
                date: fechaEvento,
                startTime: horaInicio,
                endTime: calcularHoraFin(horaInicio),
                teacher: {
                  name: item.nombreProfesor || '',
                  email: '',
                },
                students: studentsFiltrados,
                color: obtenerColorPorCurso(item.nombreCurso),
                status: tieneOrigen ? 'rescheduled-origin' : 'scheduled',
                esReagendacion: false,
                idGrupo: item.idGrupo || '',
                tipoReagendacionClase: tieneOrigen ? 'origen' : null,
              };
            });

            return [...acc, ...eventos];
          },
          []
        );

        const reagendacionesAgrupadas = Object.values(
          reagendaciones
            .filter((r: any) => {
              if (!r.fechaHoraNueva) return false;
              const fechaNueva = new Date(r.fechaHoraNueva);
              return (
                fechaNueva.getFullYear() === year &&
                fechaNueva.getMonth() === month
              );
            })
            .reduce((acc: Record<string, any>, r: any) => {
              const fechaNueva = new Date(r.fechaHoraNueva);
              const fechaKey = `${fechaNueva.getFullYear()}-${fechaNueva.getMonth()}-${fechaNueva.getDate()}`;
              const horaNueva = r.horaClaseNueva || '00:00';

              const key = `${r.idGrupoNuevo}-${fechaKey}-${horaNueva}`;

              if (!acc[key]) {
                acc[key] = {
                  id: r.reagendacionId || `reag-${r.idGrupoNuevo}-${fechaKey}-${horaNueva}`,
                  title: r.nombreCurso,
                  date: fechaNueva,
                  startTime: horaNueva,
                  endTime: calcularHoraFin(horaNueva),
                  teacher: {
                    name: r.profesorNuevo || r.profesorOriginal || '',
                    email: '',
                  },
                  students: [],
                  color: obtenerColorPorCurso(r.nombreCurso),
                  status: 'rescheduled-destination' as const,
                  esReagendacion: true,
                  reagendacionId: r.reagendacionId,
                  fechaHoraOriginal: r.fechaHoraOriginal,
                  fechaHoraNueva: r.fechaHoraNueva,
                  idGrupo: r.idGrupoNuevo,
                  tipoReagendacionClase: 'destino' as const,
                };
              }

              const fechaOriginal = r.fechaHoraOriginal ? new Date(r.fechaHoraOriginal) : null;

              acc[key].students.push({
                idAlumno: r.idAlumno,
                nombreAlumno: r.nombreAlumno,
                reagendacion: {
                  tipo: 'destino',
                  texto: fechaOriginal
                    ? `Viene de: ${fechaOriginal.toLocaleDateString('es-MX', {
                        weekday: 'short',
                      })} ${r.horaClaseOriginal || fechaOriginal.toLocaleTimeString('es-MX', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false,
                      })}`
                    : '',
                },
              });

              return acc;
            }, {})
        );

        const transformedReagendaciones: CalendarClass[] = reagendacionesAgrupadas as CalendarClass[];        

        const transformedData: CalendarClass[] = [
          ...transformedBase,
          ...transformedReagendaciones,
        ];
////////////////////////////////////////////////////////////////////////////////////////////////////////
        setClasses(transformedData);
      } catch (err: any) {
        setError(err.message || 'Error al cargar calendario');
      } finally {
        setLoading(false);
      }
    };

    fetchCalendario();
  }, [currentDate]);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      toast.success('Datos sincronizados correctamente desde CRM y KOMO');
    } catch {
      toast.error('Error al sincronizar datos');
    } finally {
      setIsSyncing(false);
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];

    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const getClassesForDate = (date: Date | null) => {
    if (!date) return [];

    return classes.filter((cls) => {
      const classDate = new Date(cls.date);

      const d1 = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const d2 = new Date(classDate.getFullYear(), classDate.getMonth(), classDate.getDate());

      return d1.getTime() === d2.getTime();
    });
  };

  const handlePrevMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    );
  };

  const handleNextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
    );
  };

  const handleClassClick = (cls: CalendarClass) => {
    setSelectedClass(cls);
    setIsDialogOpen(true);
  };

  const renderMonthView = () => {
    const days = getDaysInMonth(currentDate);

    return (
      <div className="grid grid-cols-7 gap-2">
        {DAYS.map((day) => (
          <div key={day} className="p-2 text-center text-sm font-medium text-gray-600">
            {day}
          </div>
        ))}

        {days.map((day, index) => {
          const dayClasses = getClassesForDate(day);
          const isToday =
            day &&
            day.getDate() === new Date().getDate() &&
            day.getMonth() === new Date().getMonth() &&
            day.getFullYear() === new Date().getFullYear();

          return (
            <div
              key={index}
              className={`min-h-[120px] p-2 border rounded-lg ${
                !day ? 'bg-gray-50' : 'bg-white hover:bg-gray-50'
              } ${isToday ? 'border-cyan-500 border-2' : 'border-gray-200'}`}
            >
              {day && (
                <>
                  <div
                    className={`text-sm font-medium mb-2 ${
                      isToday ? 'text-cyan-600' : 'text-gray-700'
                    }`}
                  >
                    {day.getDate()}
                  </div>

                  <div className="space-y-1">
                    {dayClasses.map((cls) => (
                      <button
                        key={cls.id}
                        onClick={() => handleClassClick(cls)}
                        className={`w-full text-left p-1.5 rounded text-xs text-white hover:opacity-90 transition-opacity relative ${
                          cls.tipoReagendacionClase === 'origen'
                            ? 'ring-2 ring-yellow-400 shadow-md border-2 border-yellow-300'
                            : cls.tipoReagendacionClase === 'destino'
                            ? 'ring-2 ring-sky-300 shadow-md border-2 border-sky-200'
                            : ''
                        }`}
                        style={{ backgroundColor: cls.color }}
                      >
                        <div className="font-medium truncate pr-7">{cls.title}</div>
                        <div className="text-[10px] opacity-90">{cls.startTime}</div>

                        {cls.tipoReagendacionClase === 'origen' && (
                          <div className="absolute top-1 right-1 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">
                            RP
                          </div>
                        )}

                        {cls.tipoReagendacionClase === 'destino' && (
                          <div className="absolute top-1 right-1 bg-sky-300 text-sky-900 text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">
                            RP
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderDayView = () => {
    const dayClasses = getClassesForDate(currentDate);
    const hours = Array.from({ length: 12 }, (_, i) => i + 8);

    return (
      <div className="space-y-2">
        {hours.map((hour) => {
          const hourString = `${hour.toString().padStart(2, '0')}:00`;

          const hourClasses = dayClasses.filter((cls) => {
            const [classHour] = cls.startTime.split(':').map(Number);
            return classHour === hour;
          });

          return (
            <div key={hour} className="flex border-b border-gray-100 py-2 min-h-[60px]">
              <div className="w-20 text-sm text-gray-500 font-medium">{hourString}</div>

              <div className="flex-1 space-y-2">
                {hourClasses.map((cls) => (
                  <button
                    key={cls.id}
                    onClick={() => handleClassClick(cls)}
                    className={`w-full text-left p-3 rounded-lg text-white hover:opacity-90 transition-opacity relative min-h-[88px] ${
                      cls.tipoReagendacionClase === 'origen'
                        ? 'ring-2 ring-yellow-400 shadow-md'
                        : cls.tipoReagendacionClase === 'destino'
                        ? 'ring-2 ring-sky-300 shadow-md'
                        : ''
                    }`}
                    style={{ backgroundColor: cls.color }}
                  >
                    <div className="font-medium pr-8">{cls.title}</div>
                    <div className="text-sm opacity-90">
                      {cls.startTime} - {cls.endTime}
                    </div>
                    <div className="text-xs opacity-90">{cls.teacher.name}</div>

                    {cls.tipoReagendacionClase === 'origen' && (
                      <div className="absolute top-2 right-2 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                        RP
                      </div>
                    )}

                    {cls.tipoReagendacionClase === 'destino' && (
                      <div className="absolute top-2 right-2 bg-sky-300 text-sky-900 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                        RP
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return <div className="p-6">Cargando calendario...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-500">Error: {error}</div>;
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-900">Goku Lab</h1>

            <Button
              onClick={handleSync}
              disabled={isSyncing}
              className="bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
              Sincronizar datos
            </Button>
          </div>

          <p className="text-gray-600">Sistema de Gestión Académica</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6">
        <Card className="p-4 mb-6 rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={handlePrevMonth}
                className="rounded-lg"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <h2 className="text-xl font-semibold text-gray-900">
                {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
              </h2>

              <Button
                variant="outline"
                size="icon"
                onClick={handleNextMonth}
                className="rounded-lg"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex gap-2">
              <Button
                variant={view === 'month' ? 'default' : 'outline'}
                onClick={() => setView('month')}
                className={`rounded-lg ${
                  view === 'month' ? 'bg-cyan-500 hover:bg-cyan-600' : ''
                }`}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                Mes
              </Button>

              <Button
                variant={view === 'day' ? 'default' : 'outline'}
                onClick={() => setView('day')}
                className={`rounded-lg ${
                  view === 'day' ? 'bg-cyan-500 hover:bg-cyan-600' : ''
                }`}
              >
                Día
              </Button>
            </div>
          </div>

          {view === 'month' ? renderMonthView() : renderDayView()}
        </Card>

        <Card className="p-4 rounded-xl shadow-sm">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Leyenda</h3>

          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-cyan-500"></div>
              <span className="text-sm text-gray-600">Programación</span>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-purple-500"></div>
              <span className="text-sm text-gray-600">Alfabetización</span>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-pink-500"></div>
              <span className="text-sm text-gray-600">Diseño</span>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-green-500"></div>
              <span className="text-sm text-gray-600">Python</span>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-amber-500"></div>
              <span className="text-sm text-gray-600">Robótica</span>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-yellow-400 text-yellow-900 text-[10px] font-bold flex items-center justify-center">
                RP
              </div>
              <span className="text-sm text-gray-600">Reagendada (origen)</span>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-sky-300 text-sky-900 text-[10px] font-bold flex items-center justify-center">
                RP
              </div>
              <span className="text-sm text-gray-600">Reagendada (destino)</span>
            </div>
          </div>
        </Card>
      </main>

      {selectedClass && (
        <ClassDetailsDialog
          classData={selectedClass}
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          onReagendar={handleReagendar}
        />
      )}

      {showReagendacion && reagendacionData && (
        <ReagendacionForm
          data={reagendacionData}
          onClose={() => setShowReagendacion(false)}
        />
      )}
    </div>
  );
}