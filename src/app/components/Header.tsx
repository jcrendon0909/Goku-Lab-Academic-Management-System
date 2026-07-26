import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { 
  Laptop, LogOut, LayoutDashboard, Calendar, Users, 
  DollarSign, BarChart, BookOpen, ClipboardCheck, UserCog, 
  Users2, Repeat, LineChart, Sun, Eye  // ✅ Agregamos Eye
} from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";

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

  return (
    <header className="fixed top-0 left-0 right-0 h-12 bg-white border-b border-gray-100 flex items-center justify-center z-50">
      <div className="w-full max-w-[1440px] px-8 flex items-center justify-between">
        {/* Logo */}
        <Link to="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity flex-shrink-0">
          <div className="w-8 h-8 bg-gradient-to-br from-[#26AAA3] to-[#67A934] rounded-lg flex items-center justify-center shadow-sm shadow-[#26AAA3]/20">
            <Laptop className="text-white w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[#26AAA3] via-[#67A934] to-[#F8B50E] leading-none">
              GōkuLab
            </span>
            <span className="text-[9px] uppercase tracking-widest text-[#26AAA3] font-bold">
              Algorithmics
            </span>
          </div>
        </Link>

        {/* Navegación central */}
        <div className="flex items-center gap-4 overflow-x-auto hide-scrollbar px-2">
          <nav className="flex items-center gap-4">
            {/* Panel */}
            <Link
              to="/dashboard"
              className={`text-xs font-medium transition-colors flex items-center gap-1 whitespace-nowrap ${
                isActive('/dashboard')
                  ? 'text-[#26AAA3] font-bold'
                  : 'text-gray-500 hover:text-[#26AAA3]'
              }`}
            >
              <LayoutDashboard className="w-3 h-3" />
              Panel
            </Link>

            {/* --- Gestión Académica --- */}
            <Link
              to="/alumnos"
              className={`text-xs font-medium transition-colors flex items-center gap-1 whitespace-nowrap ${
                isActive('/alumnos')
                  ? 'text-[#26AAA3] font-bold'
                  : 'text-gray-500 hover:text-[#26AAA3]'
              }`}
            >
              <Users className="w-3 h-3" />
              Alumnos
            </Link>
            <Link
              to="/grupos"
              className={`text-xs font-medium transition-colors flex items-center gap-1 whitespace-nowrap ${
                isActive('/grupos')
                  ? 'text-[#26AAA3] font-bold'
                  : 'text-gray-500 hover:text-[#26AAA3]'
              }`}
            >
              <BookOpen className="w-3 h-3" />
              Grupos
            </Link>
            {isAdmin && (
              <Link
                to="/cursos"
                className={`text-xs font-medium transition-colors flex items-center gap-1 whitespace-nowrap ${
                  isActive('/cursos')
                    ? 'text-[#26AAA3] font-bold'
                    : 'text-gray-500 hover:text-[#26AAA3]'
                }`}
              >
                <Users2 className="w-3 h-3" />
                Cursos
              </Link>
            )}
            {isAdmin && (
              <Link
                to="/maestros"
                className={`text-xs font-medium transition-colors flex items-center gap-1 whitespace-nowrap ${
                  isActive('/maestros')
                    ? 'text-[#26AAA3] font-bold'
                    : 'text-gray-500 hover:text-[#26AAA3]'
                }`}
              >
                <UserCog className="w-3 h-3" />
                Maestros
              </Link>
            )}

            {/* --- Control y Finanzas --- */}
            <Link
              to="/asistencia"
              className={`text-xs font-medium transition-colors flex items-center gap-1 whitespace-nowrap ${
                isActive('/asistencia')
                  ? 'text-[#26AAA3] font-bold'
                  : 'text-gray-500 hover:text-[#26AAA3]'
              }`}
            >
              <ClipboardCheck className="w-3 h-3" />
              Asistencia
            </Link>
            <Link
              to="/pagos"
              className={`text-xs font-medium transition-colors flex items-center gap-1 whitespace-nowrap ${
                isActive('/pagos')
                  ? 'text-[#26AAA3] font-bold'
                  : 'text-gray-500 hover:text-[#26AAA3]'
              }`}
            >
              <DollarSign className="w-3 h-3" />
              Pagos
            </Link>
            {isAdmin && (
              <Link
                to="/reportes/cobranza"
                className={`text-xs font-medium transition-colors flex items-center gap-1 whitespace-nowrap ${
                  isActive('/reportes/cobranza')
                    ? 'text-[#26AAA3] font-bold'
                    : 'text-gray-500 hover:text-[#26AAA3]'
                }`}
              >
                <BarChart className="w-3 h-3" />
                Cobranza
              </Link>
            )}
            {isAdmin && (
              <Link
                to="/reportes/rentabilidad"
                className={`text-xs font-medium transition-colors flex items-center gap-1 whitespace-nowrap ${
                  isActive('/reportes/rentabilidad')
                    ? 'text-[#26AAA3] font-bold'
                    : 'text-gray-500 hover:text-[#26AAA3]'
                }`}
              >
                <LineChart className="w-3 h-3" />
                Rentabilidad
              </Link>
            )}

            {/* --- Administración --- */}
            <Link
              to="/calendario"
              className={`text-xs font-medium transition-colors flex items-center gap-1 whitespace-nowrap ${
                isActive('/calendario')
                  ? 'text-[#26AAA3] font-bold'
                  : 'text-gray-500 hover:text-[#26AAA3]'
              }`}
            >
              <Calendar className="w-3 h-3" />
              Calendario
            </Link>
            <Link
              to="/reschedule"
              className={`text-xs font-medium transition-colors flex items-center gap-1 whitespace-nowrap ${
                isActive('/reschedule')
                  ? 'text-[#26AAA3] font-bold'
                  : 'text-gray-500 hover:text-[#26AAA3]'
              }`}
            >
              <Repeat className="w-3 h-3" />
              Reagendaciones
            </Link>
            {/* 👇 Usuarios - SOLO ICONO (sin texto, sin campana) */}
            {isAdmin && (
              <Link
                to="/admin/usuarios"
                className={`text-xs font-medium transition-colors flex items-center gap-1 whitespace-nowrap ${
                  isActive('/admin/usuarios')
                    ? 'text-[#26AAA3] font-bold'
                    : 'text-gray-500 hover:text-[#26AAA3]'
                }`}
                title="Usuarios"
              >
                <Users2 className="w-3 h-3" />
              </Link>
            )}
            {isAdmin && (
              <Link
                to="/cursos-verano"
                className={`text-xs font-medium transition-colors flex items-center gap-1 whitespace-nowrap ${
                  isActive('/cursos-verano')
                    ? 'text-[#26AAA3] font-bold'
                    : 'text-gray-500 hover:text-[#26AAA3]'
                }`}
              >
                <Sun className="w-3 h-3" />
                Cursos Verano
              </Link>
            )}
            {/* ✅ NUEVO: Consulta de Inscripciones - SOLO ICONO */}
            {isAdmin && (
              <Link
                to="/inscripciones-consulta"
                className={`text-xs font-medium transition-colors flex items-center gap-1 whitespace-nowrap ${
                  isActive('/inscripciones-consulta')
                    ? 'text-[#26AAA3] font-bold'
                    : 'text-gray-500 hover:text-[#26AAA3]'
                }`}
                title="Inscripciones"
              >
                <Eye className="w-3 h-3" />
              </Link>
            )}
          </nav>
        </div>

        {/* Área de usuario - SIN CAMPANA DE NOTIFICACIONES */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="flex items-center gap-2 pl-1">
            <div className="flex flex-col items-end">
              <span className="text-xs font-bold text-gray-900 leading-none">{nombreUsuario}</span>
              <span className="text-[10px] text-gray-500 capitalize">{rolUsuario || 'Usuario'}</span>
            </div>
            <div className="w-8 h-8 bg-gray-100 rounded-full border border-gray-200 overflow-hidden shadow-sm">
              <ImageWithFallback 
                src={fotoUrl}
                alt="Avatar"
                className="w-full h-full object-cover"
                fallbackSrc="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=100&auto=format&fit=crop"
              />
            </div>
            <button 
              onClick={handleLogout}
              className="ml-1 p-1.5 text-gray-400 hover:text-red-500 transition-colors"
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
      `}</style>
    </header>
  );
}