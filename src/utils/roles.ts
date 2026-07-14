// src/utils/roles.ts
export const rutaInicialPorRol = (rol: string): string => {
    const rolesMap: Record<string, string> = {
        admin: '/dashboard',
        profesor: '/dashboard',
        recepcion: '/dashboard',
    };
    return rolesMap[rol] || '/dashboard';
};

// Agregamos esta función que falta
export const esAdmin = (rol: string): boolean => {
    return rol === 'admin';
};