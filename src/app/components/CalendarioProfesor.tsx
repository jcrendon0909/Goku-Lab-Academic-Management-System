import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar as CalendarIcon, Clock, User, BookOpen, ArrowLeft } from 'lucide-react';
import { apiFetch } from '../../services/api';
import { Link } from 'react-router-dom';

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
}

export function CalendarioProfesor() {
  const navigate = useNavigate();
  const [clases, setClases] = useState<Clase[]>([]);
  const [cargando, setCargando] = useState(true);
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const idProfesor = user.idProfesor; // Asumimos que el usuario tiene este campo

  useEffect(() => {
    const cargarClases = async () => {
      try {
        // Intenta cargar desde la API real
        const url = idProfesor ? `/calendario?profesor=${idProfesor}` : '/calendario';
        const res = await apiFetch(url);
        if (res.ok) {
          const data = await res.json();
          setClases(data);
        } else {
          // Fallback a datos de ejemplo para pruebas
          setClases([
            { 
              id: '1', 
              titulo: 'Matemáticas', 
              profesor: 'Juan Pérez', 
              fecha: '2026-07-15', 
              horaInicio: '10:00', 
              horaFin: '12:00', 
              reagendada: false,
              studentId: 's1',
              studentName: 'Ana García'
            },
            { 
              id: '2', 
              titulo: 'Programación', 
              profesor: 'María Gómez', 
              fecha: '2026-07-16', 
              horaInicio: '14:00', 
              horaFin: '16:00', 
              reagendada: true,
              studentId: 's2',
              studentName: 'Carlos Ruiz'
            },
          ]);
        }
      } catch (error) {
        console.error('Error al cargar calendario:', error);
        // Datos de ejemplo en caso de error
        setClases([
          { 
            id: '1', 
            titulo: 'Matemáticas', 
            profesor: 'Juan Pérez', 
            fecha: '2026-07-15', 
            horaInicio: '10:00', 
            horaFin: '12:00', 
            reagendada: false,
            studentId: 's1',
            studentName: 'Ana García'
          },
        ]);
      } finally {
        setCargando(false);
      }
    };
    cargarClases();
  }, [idProfesor]);

  const handleReagendar = (claseId: string, studentId: string, studentName: string) => {
    navigate(`/reschedule?classId=${claseId}&studentId=${studentId}&studentName=${encodeURIComponent(studentName)}`);
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
                className={`bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow p-4 border-l-4 ${
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
                    {clase.horaInicio} - {clase.horaFin}
                  </span>
                  <span className="text-gray-300">|</span>
                  <span>{clase.fecha}</span>
                </div>

                {clase.studentId && clase.studentName && (
                  <button
                    onClick={() => handleReagendar(clase.id, clase.studentId!, clase.studentName!)}
                    className="mt-3 w-full bg-[#26AAA3] text-white py-2 rounded-lg text-sm hover:bg-[#1f8c86] transition-colors"
                  >
                    Reagendar esta clase
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}