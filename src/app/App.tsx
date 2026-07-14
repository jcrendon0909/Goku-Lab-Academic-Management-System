import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Dashboard } from './components/Dashboard';
import { ReschedulingFlow } from './components/ReschedulingFlow';
import { PagosPage } from './components/PagosPage';
import { AlumnosPage } from './components/AlumnosPage';
import { MaestrosPage } from './components/MaestrosPage';
import { CursosPage } from './components/CursosPage';
import { LoginPage } from './components/LoginPage';
import { ProtectedRoute } from './components/ProtectedRoute';
// ===== NUEVA IMPORTACIÓN =====
import RentabilidadProfesores from '../pages/RentabilidadProfesores';
import { Toaster } from './components/ui/sonner';
import { ClassProvider } from './context/ClassContext';

export const router = createBrowserRouter([
    {
        path: '/',
        Component: LoginPage,
    },
    {
        path: '/dashboard',
        element: (
            <ProtectedRoute>
                <Dashboard />
            </ProtectedRoute>
        ),
    },
    {
        path: '/reschedule',
        element: (
            <ProtectedRoute>
                <ReschedulingFlow />
            </ProtectedRoute>
        ),
    },
    {
        path: '/pagos',
        element: (
            <ProtectedRoute allowedRoles={['admin']}>
                <PagosPage />
            </ProtectedRoute>
        ),
    },
    {
        path: '/alumnos',
        element: (
            <ProtectedRoute allowedRoles={['admin']}>
                <AlumnosPage />
            </ProtectedRoute>
        ),
    },
    {
        path: '/maestros',
        element: (
            <ProtectedRoute allowedRoles={['admin']}>
                <MaestrosPage />
            </ProtectedRoute>
        ),
    },
    {
        path: '/cursos',
        element: (
            <ProtectedRoute allowedRoles={['admin']}>
                <CursosPage />
            </ProtectedRoute>
        ),
    },
    // ===== NUEVA RUTA =====
    {
        path: '/reportes/rentabilidad',
        element: (
            <ProtectedRoute allowedRoles={['admin']}>
                <RentabilidadProfesores />
            </ProtectedRoute>
        ),
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