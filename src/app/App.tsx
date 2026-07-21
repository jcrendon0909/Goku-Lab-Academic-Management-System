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
import { AdminUsuarios } from './components/AdminUsuarios';
import { CalendarioProfesor } from './components/CalendarioProfesor';
import RentabilidadProfesores from '../pages/RentabilidadProfesores';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { Toaster } from './components/ui/sonner';
import { ClassProvider } from './context/ClassContext';
import { ReporteCobranza } from './components/ReporteCobranza'; // 👈 Importa el componente

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
      { path: '/maestros', element: <MaestrosPage /> },
      { path: '/cursos', element: <CursosPage /> },
      { path: '/reportes/rentabilidad', element: <RentabilidadProfesores /> },
      { path: '/reportes/cobranza', element: <ReporteCobranza /> }, // 👈 Ruta nueva
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