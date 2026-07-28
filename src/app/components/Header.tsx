import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { LogOut, Home, Users, BookOpen, UserCog, Calendar, Repeat, Sun, Eye, Edit2, DollarSign, BarChart, LineChart, ClipboardCheck, CreditCard } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";

interface NavItem {
  path: string;
  icon: React.ReactNode;
  label: string;
  adminOnly?: boolean;
  category?: 'academic' | 'finance' | 'admin' | 'general';
}

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const nombreUsuario = user.nombreCompleto || user.usuario || 'Usuario';
  const rolUsuario = user.rol || '';
  const isAdmin = user.rol === 'admin';

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  const fotoUrl = user.idProfesor
    ? `https://media.gokulab.mx/Profesores/${user.idProfesor}.jpeg`
    : 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=100&auto=format&fit=crop';

  const isActive = (path: string) => {
    if (path === '/dashboard') return location.pathname === '/dashboard';
    return location.pathname.startsWith(path);
  };

  // Definición de navegación con categorías
  const navItems: NavItem[] = [
    // General
    { path: '/dashboard', icon: <Home className="w-4 h-4" />, label: 'Panel', category: 'general' },
    
    // Académico
    { path: '/alumnos', icon: <Users className="w-4 h-4" />, label: 'Alumnos', category: 'academic' },
    { path: '/grupos', icon: <BookOpen className="w-4 h-4" />, label: 'Grupos', category: 'academic' },
    { path: '/cursos', icon: <BookOpen className="w-4 h-4" />, label: 'Cursos', category: 'academic', adminOnly: true },
    { path: '/maestros', icon: <UserCog className="w-4 h-4" />, label: 'Maestros', category: 'academic', adminOnly: true },
    
    // Finanzas
    { path: '/asistencia', icon: <ClipboardCheck className="w-4 h-4" />, label: 'Asistencia', category: 'finance' },
    { path: '/pagos', icon: <CreditCard className="w-4 h-4" />, label: 'Pagos', category: 'finance' },
    { path: '/reportes/cobranza', icon: <BarChart className="w-4 h-4" />, label: 'Cobranza', category: 'finance', adminOnly: true },
    { path: '/reportes/rentabilidad', icon: <LineChart className="w-4 h-4" />, label: 'Rentabilidad', category: 'finance', adminOnly: true },
    { path: '/pagos-profesores', icon: <DollarSign className="w-4 h-4" />, label: 'Pagos Profesores', category: 'finance', adminOnly: true },
    
    // Administración
    { path: '/calendario', icon: <Calendar className="w-4 h-4" />, label: 'Calendario', category: 'admin' },
    { path: '/reschedule', icon: <Repeat className="w-4 h-4" />, label: 'Reagendaciones', category: 'admin', adminOnly: true },
    { path: '/admin/usuarios', icon: <Users className="w-4 h-4" />, label: 'Usuarios', category: 'admin', adminOnly: true },
    { path: '/cursos-verano', icon: <Sun className="w-4 h-4" />, label: 'Cursos Verano', category: 'admin', adminOnly: true },
    { path: '/inscripciones-consulta', icon: <Eye className="w-4 h-4" />, label: 'Inscripciones', category: 'admin', adminOnly: true },
    { path: '/admin/editor-inscripciones', icon: <Edit2 className="w-4 h-4" />, label: 'Editor', category: 'admin', adminOnly: true },
  ];

  // Filtrar según rol
  const visibleItems = navItems.filter(item => !item.adminOnly || isAdmin);

  // Categorías para separadores
  const categories = ['general', 'academic', 'finance', 'admin'];
  let lastCategory = '';

  return (
    <header className="fixed top-0 left-0 right-0 h-12 bg-white/95 backdrop-blur-sm border-b border-gray-100 flex items-center justify-center z-50 shadow-sm">
      <div className="w-full max-w-[1440px] px-4 flex items-center justify-between">
        {/* Logo */}
        <Link to="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity flex-shrink-0">
          <div className="w-8 h-8 bg-gradient-to-br from-[#26AAA3] to-[#67A934] rounded-lg flex items-center justify-center shadow-md shadow-[#26AAA3]/30">
            <span className="text-white text-lg font-bold">G</span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[#26AAA3] via-[#67A934] to-[#F8B50E] leading-none">
              GōkuLab
            </span>
            <span className="text-[8px] uppercase tracking-widest text-[#26AAA3] font-bold">
              Algorithmics
            </span>
          </div>
        </Link>

        {/* Navegación central */}
        <div className="flex items-center gap-1 overflow-x-auto hide-scrollbar px-2">
          <nav className="flex items-center gap-1">
            {visibleItems.map((item, index) => {
              const active = isActive(item.path);
              const showSeparator = item.category !== lastCategory && index > 0;
              lastCategory = item.category || '';

              return (
                <React.Fragment key={item.path}>
                  {/* Separador entre categorías */}
                  {showSeparator && (
                    <span className="w-px h-6 bg-white/20 mx-1 flex-shrink-0" />
                  )}

                  <Link
                    to={item.path}
                    className={`
                      relative flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 whitespace-nowrap
                      ${active 
                        ? 'text-[#26AAA3] bg-[#26AAA3]/10 font-bold' 
                        : 'text-gray-500 hover:text-[#26AAA3] hover:bg-[#26AAA3]/5'
                      }
                    `}
                    title={item.label}
                  >
                    <span className={`transition-transform duration-200 ${active ? 'scale-110' : ''}`}>
                      {item.icon}
                    </span>
                    <span className="hidden sm:inline">{item.label}</span>
                    
                    {/* Indicador activo - subrayado animado */}
                    {active && (
                      <span className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-6 h-0.5 bg-[#26AAA3] rounded-full animate-pulse" />
                    )}
                  </Link>
                </React.Fragment>
              );
            })}
          </nav>
        </div>

        {/* Área de usuario */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="flex items-center gap-2 pl-1">
            <div className="flex flex-col items-end">
              <span className="text-xs font-bold text-gray-900 leading-none">{nombreUsuario}</span>
              <span className="text-[10px] text-gray-500 capitalize">{rolUsuario || 'Usuario'}</span>
            </div>
            <div className="w-8 h-8 bg-gray-100 rounded-full border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              <ImageWithFallback 
                src={fotoUrl}
                alt="Avatar"
                className="w-full h-full object-cover"
                fallbackSrc="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=100&auto=format&fit=crop"
              />
            </div>
            <button 
              onClick={handleLogout}
              className="ml-1 p-1.5 text-gray-400 hover:text-red-500 transition-colors hover:bg-red-50 rounded-lg"
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .animate-pulse {
          animation: pulse 1.5s ease-in-out infinite;
        }
      `}</style>
    </header>
  );
}