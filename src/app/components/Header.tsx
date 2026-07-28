import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { LogOut } from "lucide-react"; // Solo mantenemos LogOut de lucide
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

  // Función para estilizar el enlace activo
  const linkClass = (path: string) => `
    text-xs font-medium transition-all duration-200 flex items-center gap-1 whitespace-nowrap
    ${isActive(path) 
      ? 'text-[#26AAA3] font-bold scale-110' 
      : 'text-gray-500 hover:text-[#26AAA3] hover:scale-110'}
  `;

  return (
    <header className="fixed top-0 left-0 right-0 h-12 bg-white border-b border-gray-100 flex items-center justify-center z-50 shadow-sm">
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

        {/* Navegación central - con iconos divertidos */}
        <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar px-2">
          <nav className="flex items-center gap-2">
            {/* Panel */}
            <Link to="/dashboard" className={linkClass('/dashboard')} title="Panel">
              🚀
            </Link>

            {/* --- Gestión Académica --- */}
            <Link to="/alumnos" className={linkClass('/alumnos')} title="Alumnos">
              👨‍🎓
            </Link>
            <Link to="/grupos" className={linkClass('/grupos')} title="Grupos">
              📚
            </Link>
            {isAdmin && (
              <Link to="/cursos" className={linkClass('/cursos')} title="Cursos">
                📖
              </Link>
            )}
            {isAdmin && (
              <Link to="/maestros" className={linkClass('/maestros')} title="Maestros">
                🧑‍🏫
              </Link>
            )}

            {/* --- Control y Finanzas --- */}
            <Link to="/asistencia" className={linkClass('/asistencia')} title="Asistencia">
              ✅
            </Link>
            <Link to="/pagos" className={linkClass('/pagos')} title="Pagos">
              💰
            </Link>
            {isAdmin && (
              <Link to="/reportes/cobranza" className={linkClass('/reportes/cobranza')} title="Cobranza">
                📊
              </Link>
            )}
            {isAdmin && (
              <Link to="/reportes/rentabilidad" className={linkClass('/reportes/rentabilidad')} title="Rentabilidad">
                📈
              </Link>
            )}

            {/* --- Administración --- */}
            <Link to="/calendario" className={linkClass('/calendario')} title="Calendario">
              📅
            </Link>
            {isAdmin && (
              <Link to="/reschedule" className={linkClass('/reschedule')} title="Reagendaciones">
                🔄
              </Link>
            )}
            {isAdmin && (
              <Link to="/admin/usuarios" className={linkClass('/admin/usuarios')} title="Usuarios">
                👥
              </Link>
            )}
            {isAdmin && (
              <Link to="/cursos-verano" className={linkClass('/cursos-verano')} title="Cursos Verano">
                ☀️
              </Link>
            )}
            {isAdmin && (
              <Link to="/inscripciones-consulta" className={linkClass('/inscripciones-consulta')} title="Inscripciones">
                👁️
              </Link>
            )}
            {isAdmin && (
              <Link to="/admin/editor-inscripciones" className={linkClass('/admin/editor-inscripciones')} title="Editor Inscripciones">
                ✏️
              </Link>
            )}
            {/* ✅ NUEVO: Pagos a Profesores */}
            {isAdmin && (
              <Link to="/pagos-profesores" className={linkClass('/pagos-profesores')} title="Pagos a Profesores">
                💵
              </Link>
            )}
          </nav>
        </div>

        {/* Área de usuario */}
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