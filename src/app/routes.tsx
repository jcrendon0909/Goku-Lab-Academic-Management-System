import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { ReschedulingFlow } from './components/ReschedulingFlow';
import { PagosPage } from './components/PagosPage';
import { AlumnosPage } from './components/AlumnosPage';
import { ProfesoresPage } from './components/ProfesoresPage';
import { CursosPage } from './components/CursosPage';
import { LoginPage } from './components/LoginPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminUsuarios } from './components/AdminUsuarios';
import { CalendarioProfesor } from './components/CalendarioProfesor';
import RentabilidadProfesores from '../pages/RentabilidadProfesores';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { Toaster } from './components/ui/sonner';
import { ClassProvider } from './context/ClassContext';
import { ReporteCobranza } from './components/ReporteCobranza';
import { GruposPage } from './components/GruposPage';
import { AsistenciaPage } from './components/AsistenciaPage';
import { CursosVeranoPage } from './components/CursosVeranoPage';
import { CursoVeranoForm } from './components/CursoVeranoForm';
import { CursoVeranoDetalle } from './components/CursoVeranoDetalle';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: LoginPage,
  },
  {
    path: '/reset-password',
    element: <ResetPasswordPage />,
  },
  {
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
      { path: '/maestros', element: <ProfesoresPage /> },
      { path: '/cursos', element: <CursosPage /> },
      { path: '/grupos', element: <GruposPage /> },
      { path: '/reportes/rentabilidad', element: <RentabilidadProfesores /> },
      { path: '/reportes/cobranza', element: <ReporteCobranza /> },
      { path: '/admin/usuarios', element: <AdminUsuarios /> },
      { path: '/calendario', element: <CalendarioProfesor /> },
      { path: '/asistencia', element: <AsistenciaPage /> },
      // Cursos de Verano
      { path: '/cursos-verano', element: <CursosVeranoPage /> },
      { path: '/cursos-verano/nuevo', element: <CursoVeranoForm /> },
      { path: '/cursos-verano/:id/editar', element: <CursoVeranoForm /> },
      { path: '/cursos-verano/:id', element: <CursoVeranoDetalle /> },
      { path: '/cursos-verano/:id/rentabilidad', element: <div className="p-8 text-center text-gray-600">Rentabilidad (próximamente)</div> },
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