import React from "react";
import { Bell, Laptop } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";

export function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 h-12 bg-white border-b border-gray-100 flex items-center justify-center z-50">
      <div className="w-full max-w-[1440px] px-8 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-cyan-500 rounded-lg flex items-center justify-center shadow-sm shadow-cyan-500/20">
            <Laptop className="text-white w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold tracking-tight text-gray-900 leading-none">Goku Lab</span>
            <span className="text-[9px] uppercase tracking-widest text-cyan-500 font-bold">Algorithmics</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <nav className="hidden md:flex items-center gap-6">
            <a href="#" className="text-xs font-semibold text-cyan-500 underline underline-offset-4 decoration-2">Pagos</a>
            <a href="#" className="text-xs font-medium text-gray-500 hover:text-cyan-500 transition-colors">Alumnos</a>
            <a href="#" className="text-xs font-medium text-gray-500 hover:text-cyan-500 transition-colors">Clases</a>
            <a href="#" className="text-xs font-medium text-gray-500 hover:text-cyan-500 transition-colors">Reportes</a>
          </nav>

          <div className="h-6 w-[1px] bg-gray-100 hidden md:block"></div>

          <div className="flex items-center gap-3">
            <button className="relative p-1.5 text-gray-400 hover:text-cyan-500 transition-colors">
              <Bell className="w-4 h-4" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-yellow-400 rounded-full border-2 border-white"></span>
            </button>
            <div className="flex items-center gap-2 pl-1">
              <div className="flex flex-col items-end">
                <span className="text-xs font-bold text-gray-900 leading-none">Marco</span>
                <span className="text-[10px] text-gray-500">Administrador</span>
              </div>
              <div className="w-7 h-7 bg-gray-100 rounded-full border border-gray-200 overflow-hidden">
                <ImageWithFallback 
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=100&auto=format&fit=crop" 
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
