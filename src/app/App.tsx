import { createBrowserRouter, RouterProvider } from 'react-router-dom'; // o 'react-router-dom'
import { Dashboard } from './components/Dashboard';
import { ReschedulingFlow } from './components/ReschedulingFlow';
import { PagosPage } from './components/PagosPage';
import { LoginPage } from './components/LoginPage';
import { ProtectedRoute } from './components/ProtectedRoute';

// Importamos los contextos que tenías originalmente en tu App.tsx
import { Toaster } from './components/ui/sonner';
import { ClassProvider } from './context/ClassContext';

// 1. Configuración de los caminos (Lo que habías puesto)
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
            <ProtectedRoute>
                <PagosPage />
            </ProtectedRoute>
        ),
    },
]);

// 2. ?? ¡ESTE ES EL COMPONENTE QUE LE RECLAMA MAIN.TSX A TU APLICACIÓN! ??
export default function App() {
    return (
        <ClassProvider>
            <RouterProvider router={router} />
            <Toaster />
        </ClassProvider>
    );
}