import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell, Laptop, LogOut, LayoutDashboard, Calendar, Users, DollarSign } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";

export function Header() {
  const navigate = useNavigate();
  // Obtenemos los datos del usuario desde localStorage
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const nombreUsuario = user.nombreCompleto || user.usuario || 'Usuario';
  const rolUsuario = user.rol || '';

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-12 bg-white border-b border-gray-100 flex items-center justify-center z-50">
      <div className="w-full max-w-[1440px] px-8 flex items-center justify-between">
        {/* Logo y nombre de la academia - ahora enlace al dashboard */}
        <Link to="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 bg-[#26AAA3] rounded-lg flex items-center justify-center shadow-sm shadow-[#26AAA3]/20">
            <Laptop className="text-white w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold tracking-tight text-gray-900 leading-none">GōkuLab</span>
            <span className="text-[9px] uppercase tracking-widest text-[#26AAA3] font-bold">Algorithmics</span>
          </div>
        </Link>

        {/* Navegación central */}
        <div className="flex items-center gap-4">
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/dashboard" className="text-xs font-medium text-gray-500 hover:text-[#26AAA3] transition-colors flex items-center gap-1">
              <LayoutDashboard className="w-3 h-3" />
              Panel
            </Link>
            <Link to="/calendario" className="text-xs font-medium text-gray-500 hover:text-[#26AAA3] transition-colors flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Calendario
            </Link>
            <Link to="/pagos" className="text-xs font-medium text-gray-500 hover:text-[#26AAA3] transition-colors flex items-center gap-1">
              <DollarSign className="w-3 h-3" />
              Pagos
            </Link>
            <Link to="/alumnos" className="text-xs font-medium text-gray-500 hover:text-[#26AAA3] transition-colors flex items-center gap-1">
              <Users className="w-3 h-3" />
              Alumnos
            </Link>
            {/* Otros enlaces que ya tenías: Clases, Reportes, etc. (los mantengo comentados por si los necesitas) */}
            {/* <a href="#" className="text-xs font-medium text-gray-500 hover:text-cyan-500 transition-colors">Clases</a> */}
            {/* <a href="#" className="text-xs font-medium text-gray-500 hover:text-cyan-500 transition-colors">Reportes</a> */}
          </nav>

          <div className="h-6 w-[1px] bg-gray-100 hidden md:block"></div>

          {/* Área de usuario y acciones */}
          <div className="flex items-center gap-3">
            <button className="relative p-1.5 text-gray-400 hover:text-[#26AAA3] transition-colors">
              <Bell className="w-4 h-4" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-yellow-400 rounded-full border-2 border-white"></span>
            </button>
            
            <div className="flex items-center gap-2 pl-1">
              <div className="flex flex-col items-end">
                {/* 👇 Aquí mostramos el nombre y rol real del usuario logueado */}
                <span className="text-xs font-bold text-gray-900 leading-none">{nombreUsuario}</span>
                <span className="text-[10px] text-gray-500 capitalize">{rolUsuario || 'Usuario'}</span>
              </div>
              <div className="w-7 h-7 bg-gray-100 rounded-full border border-gray-200 overflow-hidden">
                <ImageWithFallback 
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=100&auto=format&fit=crop" 
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              </div>
              {/* 👇 Botón de logout */}
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
      </div>
    </header>
  );
}