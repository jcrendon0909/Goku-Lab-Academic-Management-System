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
}

interface ClassContextType {
  classes: Clase[];
  loading: boolean;
  rescheduleClass: (classId: string, studentId: string, data: any) => Promise<void>;
  refreshClasses: () => Promise<void>;
}

const ClassContext = createContext<ClassContextType | undefined>(undefined);

export const ClassProvider = ({ children }: { children: ReactNode }) => {
  const [classes, setClasses] = useState<Clase[]>([]);
  const [loading, setLoading] = useState(true);

  const loadClasses = async () => {
    try {
      setLoading(true);
      // Obtener idProfesor del usuario logueado
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const idProfesor = user.idProfesor;
      const url = idProfesor ? `/calendario?profesor=${idProfesor}` : '/calendario';
      
      const res = await apiFetch(url);
      const data = await res.json();
      
      // Transformar la respuesta del backend al formato del frontend
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
    const payload = {
      idAlumno: studentId,
      idGrupoOrigen: classId,
      idGrupoNuevo: classId, // 👈 CORREGIDO: mantener el mismo grupo
      fechaHoraNueva: new Date(`${data.newDate}T${data.newTime}`).toISOString(),
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