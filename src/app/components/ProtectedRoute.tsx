import React from 'react';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
    children: React.ReactElement;
    allowedRoles?: string[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
    const token = localStorage.getItem('token');
    const userStorage = localStorage.getItem('user');

    let user = null;

    // Con este try/catch evitamos que la app se muera si el localStorage tiene basura
    try {
        user = userStorage ? JSON.parse(userStorage) : null;
    } catch (error) {
        console.error("Error leyendo el usuario del localStorage", error);
        localStorage.clear(); // Limpiamos para evitar bucles
    }

    // Si no hay sesión válida, al login
    if (!token || !user) {
        return <Navigate to="/" replace />;
    }

    // Si el rol no coincide, mandamos al calendario (vista permitida para todos)
    if (allowedRoles && !allowedRoles.includes(user.rol)) {
        return <Navigate to="/dashboard" replace />;
    }

    return children;
}