// src/utils/roles.ts
export const rutaInicialPorRol = (rol: string): string => {
    const rolesMap: Record<string, string> = {
        admin: '/dashboard',
        profesor: '/dashboard',
        recepcion: '/dashboard',
        // Agrega aquí otros roles si los tienes
    };
    return rolesMap[rol] || '/dashboard';
};

export const esAdmin = (rol: string): boolean => {
    return rol === 'admin';
};