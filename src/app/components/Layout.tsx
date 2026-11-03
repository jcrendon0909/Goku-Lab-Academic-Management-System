import React, { useState } from "react";
import { Link, useNavigate, useLocation, Outlet } from "react-router-dom";
import {
  LogOut, Home, Users, BookOpen, UserCog, Calendar, Repeat, Award,
  DollarSign, BarChart, LineChart, CreditCard, Receipt, Wallet,
  Menu, ChevronLeft, ChevronRight, Server, ClipboardCheck
} from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";

interface NavItem {
  path: string;
  icon: React.ReactNode;
  label: string;
  roles: string[];
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

export function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const rol = user.rol || '';

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  const fotoUrl = user.idProfesor
    ? `https://media.gokulab.mx/Profesores/${user.idProfesor}.jpeg`
    : 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=100&auto=format&fit=crop';

  // 🗺️ AGRUPACIÓN LÓGICA DE MÓDULOS
  const navGroups: NavGroup[] = [
    {
      title: "Principal",
      items: [
        { path: '/dashboard', icon: <Home className="w-5 h-5" />, label: 'Dashboard', roles: ['admin', 'profesor'] },
      ]
    },
    {
      title: "Académico",
      items: [
        { path: '/alumnos', icon: <Users className="w-5 h-5" />, label: 'Alumnos', roles: ['admin', 'profesor'] },
        { path: '/maestros', icon: <UserCog className="w-5 h-5" />, label: 'Maestros', roles: ['admin'] },
        { path: '/grupos', icon: <BookOpen className="w-5 h-5" />, label: 'Grupos', roles: ['admin', 'profesor'] },
        { path: '/cursos', icon: <BookOpen className="w-5 h-5" />, label: 'Cursos Regulares', roles: ['admin', 'profesor'] },
        { path: '/cursos-verano', icon: <Award className="w-5 h-5 text-orange-500" />, label: 'Cursos Extras', roles: ['admin'] },
      ]
    },
    {
      title: "Operación",
      items: [
        { path: '/asistencia', icon: <ClipboardCheck className="w-5 h-5" />, label: 'Asistencia', roles: ['admin', 'profesor'] },
        { path: '/calendario', icon: <Calendar className="w-5 h-5" />, label: 'Calendario', roles: ['admin', 'profesor'] },
        { path: '/reschedule', icon: <Repeat className="w-5 h-5" />, label: 'Reagendaciones', roles: ['admin'] },
      ]
    },
    {
      title: "Finanzas",
      items: [
        { path: '/pagos', icon: <CreditCard className="w-5 h-5" />, label: 'Pagos Alumnos', roles: ['admin'] },
        { path: '/gastos', icon: <Receipt className="w-5 h-5" />, label: 'Gastos', roles: ['admin'] },
        { path: '/pagos-profesores', icon: <DollarSign className="w-5 h-5" />, label: 'Nómina Profesores', roles: ['admin'] },
      ]
    },
    {
      title: "Inteligencia",
      items: [
        { path: '/reportes/global', icon: <Wallet className="w-5 h-5" />, label: 'Rentabilidad Global', roles: ['admin'] },
        { path: '/reportes/rentabilidad', icon: <LineChart className="w-5 h-5" />, label: 'Rentabilidad Profesor', roles: ['admin'] },
        { path: '/reportes/cobranza', icon: <BarChart className="w-5 h-5" />, label: 'Cobranza', roles: ['admin'] },
      ]
    },
    {
      title: "Sistema",
      items: [
        { path: '/admin/usuarios', icon: <Users className="w-5 h-5" />, label: 'Usuarios', roles: ['admin'] },
        { path: '/admin/instancias', icon: <Server className="w-5 h-5" />, label: 'Instancias', roles: ['admin'] },
      ]
    }
  ];

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      {/* SIDEBAR (Barra Lateral) */}
      <aside className={`bg-white border-r border-gray-200 flex flex-col transition-all duration-300 flex-shrink-0 ${isCollapsed ? 'w-20' : 'w-64'}`}>
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-100 flex-shrink-0">
          <Link to="/dashboard" className="flex items-center gap-2 overflow-hidden">
            <div className="w-8 h-8 bg-gradient-to-br from-[#26AAA3] to-[#67A934] rounded-lg flex items-center justify-center flex-shrink-0 shadow-md">
              <span className="text-white text-lg font-bold">G</span>
            </div>
            {!isCollapsed && (
              <div className="flex flex-col whitespace-nowrap">
                <span className="text-sm font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[#26AAA3] via-[#67A934] to-[#F8B50E] leading-none">
                  GōkuLab
                </span>
                <span className="text-[9px] uppercase tracking-widest text-[#26AAA3] font-bold">
                  System
                </span>
              </div>
            )}
          </Link>
          <button onClick={() => setIsCollapsed(!isCollapsed)} className="text-gray-400 hover:text-gray-600 transition-colors">
            {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        </div>

        {/* Navegación */}
        <div className="flex-1 overflow-y-auto py-4 hide-scrollbar">
          {navGroups.map((group, idx) => {
            const visibleItems = group.items.filter(item => item.roles.includes(rol));
            if (visibleItems.length === 0) return null;

            return (
              <div key={idx} className="mb-6 px-3">
                {!isCollapsed && (
                  <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 px-3">
                    {group.title}
                  </h3>
                )}
                <div className="space-y-1">
                  {visibleItems.map((item) => {
                    const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        title={isCollapsed ? item.label : undefined}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                          isActive 
                            ? 'bg-[#26AAA3]/10 text-[#26AAA3] font-bold' 
                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 font-medium'
                        }`}
                      >
                        <div className={`${isActive ? 'text-[#26AAA3]' : 'text-gray-400'}`}>
                          {item.icon}
                        </div>
                        {!isCollapsed && <span className="text-sm">{item.label}</span>}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      {/* ÁREA DERECHA (TopBar + Contenido) */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0 z-10 shadow-sm">
          <div className="flex items-center gap-4">
            <button className="md:hidden text-gray-500"><Menu /></button>
            <h2 className="text-lg font-bold text-gray-800 hidden sm:block">
              {navGroups.flatMap(g => g.items).find(i => location.pathname.startsWith(i.path))?.label || 'Panel Principal'}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-200">
              <div className="flex flex-col items-end hidden sm:flex">
                <span className="text-sm font-bold text-gray-900 leading-tight">{user.nombreCompleto || user.usuario || 'Usuario'}</span>
                <span className="text-[10px] text-gray-500 capitalize">{rol || 'Rol'}</span>
              </div>
              <div className="w-8 h-8 rounded-full overflow-hidden border border-gray-300 shadow-sm">
                <ImageWithFallback src={fotoUrl} alt="Avatar" className="w-full h-full object-cover" />
              </div>
            </div>
            <div className="w-px h-6 bg-gray-300 mx-1"></div>
            <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Cerrar sesión">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Aquí se renderizan las páginas (Dashboard, Alumnos, etc.) */}
        <main className="flex-1 overflow-auto bg-gray-50 relative">
          <Outlet />
        </main>
      </div>
      
      {/* Estilos para ocultar scrollbar del menú */}
      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}