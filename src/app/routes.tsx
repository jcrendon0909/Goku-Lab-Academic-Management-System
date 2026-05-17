import { createBrowserRouter } from 'react-router-dom';
import React from 'react';
import { Dashboard } from './components/Dashboard';
import { ReschedulingFlow } from './components/ReschedulingFlow';
import { PagosPage } from './components/PagosPage';
import { LoginPage } from './components/LoginPage';
import { ProtectedRoute } from './components/ProtectedRoute';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <LoginPage />,
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