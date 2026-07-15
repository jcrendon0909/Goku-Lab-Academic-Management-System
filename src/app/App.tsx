// src/app/App.tsx
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { ReschedulingFlow } from './components/ReschedulingFlow';
import { PagosPage } from './components/PagosPage';
import { AlumnosPage } from './components/AlumnosPage';
import { MaestrosPage } from './components/MaestrosPage';
import { CursosPage } from './components/CursosPage';
import { LoginPage } from './components/LoginPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import RentabilidadProfesores from '../pages/RentabilidadProfesores';
import { CalendarioProfesor } from './components/CalendarioProfesor';
import { AdminUsuarios } from './components/AdminUsuarios';
import { Toaster } from './components/ui/sonner';
import { ClassProvider } from './context/ClassContext';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: LoginPage,
  },
  {
    // Todas las rutas protegidas comparten el Layout (con Header)
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      { path: '/dashboard', element: <Dashboard /> },
      { path: '/reschedule', element: <ReschedulingFlow /> },
      { path: '/pagos', element: <PagosPage /> },
      { path: '/alumnos', element: <AlumnosPage /> },
      { path: '/maestros', element: <MaestrosPage /> },
      { path: '/cursos', element: <CursosPage /> },
      { path: '/reportes/rentabilidad', element: <RentabilidadProfesores /> },
      { path: '/admin/usuarios', element: <AdminUsuarios /> },
      { path: '/calendario', element: <CalendarioProfesor /> },
    ],
  },
]);

export default function App() {
  return (
    <ClassProvider>
      <RouterProvider router={router} />
      <Toaster />
    </ClassProvider>
  );
}