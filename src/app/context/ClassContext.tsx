import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiFetch } from '../../services/api';

interface Clase {
  id: string;
  title: string;
  teacher: { id: string; name: string };
  startTime: string;
  endTime: string;
  studentId?: string;
  studentName?: string;
  idGrupo?: string;
  diaClase?: string; // 👈 Campo para el día de la semana
}

interface ClassContextType {
  classes: Clase[];
  loading: boolean;
  rescheduleClass: (classId: string, studentId: string, data: any) => Promise<void>;
  refreshClasses: () => Promise<void>;
}

const ClassContext = createContext<ClassContextType | undefined>(undefined);

// ============================================================
// 🔥 NUEVA FUNCIÓN: calcular fecha a partir de día de la semana y hora
// ============================================================
function obtenerProximaFecha(diaSemana: string, hora: string): Date {
  const dias: Record<string, number> = {
    'lunes': 1, 'martes': 2, 'miércoles': 3, 'jueves': 4,
    'viernes': 5, 'sábado': 6, 'domingo': 7
  };
  
  const diaNum = dias[diaSemana.toLowerCase().trim()];
  if (!diaNum) {
    // Fallback: hoy a las 00:00
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    return hoy;
  }
  
  const hoy = new Date();
  const hoyNum = hoy.getDay() || 7; // domingo = 7 en nuestro mapa
  let diff = diaNum - hoyNum;
  if (diff < 0) diff += 7;
  
  const fecha = new Date(hoy);
  fecha.setDate(fecha.getDate() + diff);
  
  // Asignar la hora
  const [h, m] = hora.split(':').map(Number);
  if (!isNaN(h) && !isNaN(m)) {
    fecha.setHours(h, m, 0, 0);
  }
  return fecha;
}

export const ClassProvider = ({ children }: { children: ReactNode }) => {
  const [classes, setClasses] = useState<Clase[]>([]);
  const [loading, setLoading] = useState(true);

  const loadClasses = async () => {
    try {
      setLoading(true);
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const idProfesor = user.idProfesor;
      const url = idProfesor ? `/calendario?profesor=${idProfesor}` : '/calendario';
      
      const res = await apiFetch(url);
      const data = await res.json();
      
      const clasesBase = data.clasesBase || [];
      const mapped = clasesBase.map((grupo: any) => ({
        id: grupo.idGrupo,
        title: grupo.nombreCurso,
        teacher: { 
          id: grupo.idProfesor || '', 
          name: grupo.nombreProfesor || 'Sin profesor' 
        },
        startTime: grupo.horaClase || '',
        endTime: grupo.horaFin || '',
        studentId: grupo.alumnos?.[0]?.idAlumno || '',
        studentName: grupo.alumnos?.[0]?.nombreAlumno || '',
        idGrupo: grupo.idGrupo,
        diaClase: grupo.diaClase || '', // 👈 Guardamos el día de la semana
      }));
      setClasses(mapped);
    } catch (error) {
      console.error('Error cargando clases:', error);
      setClasses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClasses();
  }, []);

  const rescheduleClass = async (classId: string, studentId: string, data: any) => {
    try {
      // Buscar la clase original para obtener el día y la hora
      const claseOriginal = classes.find(c => c.id === classId);
      if (!claseOriginal) {
        throw new Error('No se encontró la clase original');
      }

      // Calcular fecha original usando el día de la semana y la hora
      const diaSemana = claseOriginal.diaClase || 'lunes'; // fallback
      const horaInicio = claseOriginal.startTime || '00:00';
      const fechaOriginal = obtenerProximaFecha(diaSemana, horaInicio);

      // Calcular fecha de la nueva clase
      const fechaNueva = new Date(`${data.newDate}T${data.newTime}`);

      const payload = {
        idAlumno: studentId,
        idGrupoOrigen: classId,
        idGrupoNuevo: classId, // el grupo no cambia
        fechaHoraOriginal: fechaOriginal.toISOString(), // 👈 Campo requerido
        fechaHoraNueva: fechaNueva.toISOString(),
        comentario: `Reagendado por ${data.studentName} - Nuevo profesor: ${data.newTeacher?.name || ''}`,
        tipoReagendacion: 'temporal',
      };

      const res = await apiFetch('/reagendaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Error al reagendar');
      }

      // Recargar clases para reflejar el cambio
      await loadClasses();
    } catch (error) {
      console.error('Error en rescheduleClass:', error);
      throw error;
    }
  };

  return (
    <ClassContext.Provider value={{ classes, loading, rescheduleClass, refreshClasses: loadClasses }}>
      {children}
    </ClassContext.Provider>
  );
};

export const useClasses = () => {
  const context = useContext(ClassContext);
  if (!context) throw new Error('useClasses must be used within a ClassProvider');
  return context;
};