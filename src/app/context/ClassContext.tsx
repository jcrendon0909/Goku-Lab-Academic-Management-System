import { createContext, useContext, useState, ReactNode } from 'react';
import { mockClasses, Class, Teacher } from '../data/mockData';

interface RescheduleData {
  newDate: string;
  newTime: string;
  newTeacher: Teacher;
  studentName: string;
  duration: number; // duración en horas
}

interface ClassContextType {
  classes: Class[];
  rescheduleClass: (classId: string, studentId: string, data: RescheduleData) => void;
}

const ClassContext = createContext<ClassContextType | undefined>(undefined);

export function ClassProvider({ children }: { children: ReactNode }) {
  const [classes, setClasses] = useState<Class[]>(mockClasses);

  const rescheduleClass = (classId: string, studentId: string, data: RescheduleData) => {
    setClasses(prevClasses => {
      return prevClasses.map(cls => {
        if (cls.id === classId) {
          // Parsear la nueva fecha y hora
          const [year, month, day] = data.newDate.split('-').map(Number);
          const [hours, minutes] = data.newTime.split(':').map(Number);
          const newDate = new Date(year, month - 1, day, hours, minutes);

          // Calcular endTime basado en la duración
          const endHours = hours + Math.floor(data.duration);
          const endMinutes = minutes + ((data.duration % 1) * 60);
          const finalEndHours = endHours + Math.floor(endMinutes / 60);
          const finalEndMinutes = endMinutes % 60;

          return {
            ...cls,
            date: newDate,
            startTime: data.newTime,
            endTime: `${finalEndHours.toString().padStart(2, '0')}:${finalEndMinutes.toString().padStart(2, '0')}`,
            teacher: data.newTeacher,
            status: 'rescheduled' as const,
            rescheduledBy: data.studentName,
          };
        }
        return cls;
      });
    });
  };

  return (
    <ClassContext.Provider value={{ classes, rescheduleClass }}>
      {children}
    </ClassContext.Provider>
  );
}

export function useClasses() {
  const context = useContext(ClassContext);
  if (context === undefined) {
    throw new Error('useClasses must be used within a ClassProvider');
  }
  return context;
}