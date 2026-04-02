// Datos mock para el sistema de gestión de Goku Lab

export interface Student {
  id: string;
  name: string;
  email: string;
}

export interface Teacher {
  id: string;
  name: string;
  email: string;
  available: boolean;
}

export interface Class {
  id: string;
  title: string;
  date: Date;
  startTime: string;
  endTime: string;
  teacher: Teacher;
  students: Student[];
  color: string;
  status: 'scheduled' | 'rescheduled';
  rescheduledBy?: string;
}

export const teachers: Teacher[] = [
  { id: 't1', name: 'Prof. María González', email: 'maria@gokulab.com', available: true },
  { id: 't2', name: 'Prof. Carlos Mendoza', email: 'carlos@gokulab.com', available: true },
  { id: 't3', name: 'Prof. Ana López', email: 'ana@gokulab.com', available: false },
  { id: 't4', name: 'Prof. Jorge Ramírez', email: 'jorge@gokulab.com', available: true },
];

export const students: Student[] = [
  { id: 's1', name: 'Juan Pérez', email: 'juan@example.com' },
  { id: 's2', name: 'Laura Martínez', email: 'laura@example.com' },
  { id: 's3', name: 'Pedro Sánchez', email: 'pedro@example.com' },
  { id: 's4', name: 'Sofia García', email: 'sofia@example.com' },
  { id: 's5', name: 'Miguel Torres', email: 'miguel@example.com' },
  { id: 's6', name: 'Valentina Ruiz', email: 'valentina@example.com' },
  { id: 's7', name: 'Diego Castro', email: 'diego@example.com' },
  { id: 's8', name: 'Isabella Morales', email: 'isabella@example.com' },
];

export const classColors = [
  '#06b6d4', // cyan
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#10b981', // green
  '#f59e0b', // amber
  '#3b82f6', // blue
  '#ef4444', // red
  '#14b8a6', // teal
];

// Generar clases mock para el mes actual
const today = new Date();
const currentMonth = today.getMonth();
const currentYear = today.getFullYear();

export const mockClasses: Class[] = [
  {
    id: 'c1',
    title: 'Fundamentos de la programación',
    date: new Date(currentYear, currentMonth, 5, 9, 0),
    startTime: '09:00',
    endTime: '11:00',
    teacher: teachers[0],
    students: [students[0], students[1], students[2]],
    color: classColors[0],
    status: 'scheduled',
  },
  {
    id: 'c2',
    title: 'Alfabetización digital',
    date: new Date(currentYear, currentMonth, 5, 14, 0),
    startTime: '14:00',
    endTime: '16:00',
    teacher: teachers[1],
    students: [students[3], students[4]],
    color: classColors[1],
    status: 'scheduled',
  },
  {
    id: 'c3',
    title: 'Diseño de Videojuegos con Roblox',
    date: new Date(currentYear, currentMonth, 8, 10, 0),
    startTime: '10:00',
    endTime: '12:00',
    teacher: teachers[2],
    students: [students[5], students[6], students[7]],
    color: classColors[2],
    status: 'scheduled',
  },
  {
    id: 'c4',
    title: 'Python Star I',
    date: new Date(currentYear, currentMonth, 12, 15, 0),
    startTime: '15:00',
    endTime: '17:00',
    teacher: teachers[3],
    students: [students[0], students[3], students[5]],
    color: classColors[3],
    status: 'scheduled',
  },
  {
    id: 'c5',
    title: 'Robótica',
    date: new Date(currentYear, currentMonth, 15, 9, 0),
    startTime: '09:00',
    endTime: '11:00',
    teacher: teachers[0],
    students: [students[1], students[2], students[4]],
    color: classColors[4],
    status: 'scheduled',
  },
  {
    id: 'c6',
    title: 'Diseño Gráfico',
    date: new Date(currentYear, currentMonth, 18, 13, 0),
    startTime: '13:00',
    endTime: '15:00',
    teacher: teachers[1],
    students: [students[6], students[7]],
    color: classColors[5],
    status: 'rescheduled',
    rescheduledBy: 'Prof. Carlos Mendoza',
  },
  {
    id: 'c7',
    title: 'IA',
    date: new Date(currentYear, currentMonth, 22, 11, 0),
    startTime: '11:00',
    endTime: '13:00',
    teacher: teachers[3],
    students: [students[0], students[1], students[3], students[5]],
    color: classColors[6],
    status: 'scheduled',
  },
  {
    id: 'c8',
    title: 'Diseño de Videojuegos con Unity',
    date: new Date(currentYear, currentMonth, 25, 16, 0),
    startTime: '16:00',
    endTime: '18:00',
    teacher: teachers[2],
    students: [students[2], students[4], students[6]],
    color: classColors[7],
    status: 'scheduled',
  },
  {
    id: 'c9',
    title: 'Alfabetización digital para adultos',
    date: new Date(currentYear, currentMonth, 10, 10, 0),
    startTime: '10:00',
    endTime: '12:00',
    teacher: teachers[0],
    students: [students[3], students[7]],
    color: classColors[1],
    status: 'scheduled',
  },
  {
    id: 'c10',
    title: 'Diseño Web',
    date: new Date(currentYear, currentMonth, 14, 14, 0),
    startTime: '14:00',
    endTime: '16:00',
    teacher: teachers[1],
    students: [students[0], students[2], students[5]],
    color: classColors[5],
    status: 'scheduled',
  },
  {
    id: 'c11',
    title: 'Animación Digital',
    date: new Date(currentYear, currentMonth, 19, 9, 0),
    startTime: '09:00',
    endTime: '11:00',
    teacher: teachers[3],
    students: [students[1], students[4], students[6]],
    color: classColors[2],
    status: 'scheduled',
  },
  {
    id: 'c12',
    title: 'Python Pro I',
    date: new Date(currentYear, currentMonth, 23, 15, 0),
    startTime: '15:00',
    endTime: '17:00',
    teacher: teachers[0],
    students: [students[0], students[3]],
    color: classColors[3],
    status: 'scheduled',
  },
];