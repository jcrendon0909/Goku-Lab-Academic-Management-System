import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';

export function Navbar() {
    const navigate = useNavigate();
    const location = useLocation(); 

    const userStorage = localStorage.getItem('user');
    const user = userStorage ? JSON.parse(userStorage) : null;

    const handleLogout = () => {
        localStorage.clear(); 
        toast.success("Sesión cerrada correctamente");
        navigate('/');
    };

    const isActive = (path: string) => location.pathname === path;

    return (
        <nav className="bg-white border-b border-gray-100 w-full sticky top-0 z-50 shadow-sm">
            <div className="max-w-6xl mx-auto px-8 h-16 flex items-center justify-between">
                
                <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/dashboard')}>
                    <span className="text-2xl">??</span>
                    <span className="font-black text-gray-800 tracking-wider text-sm uppercase">Goku Lab</span>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${isActive('/dashboard') ? 'bg-cyan-50 text-cyan-600' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'}`}
                    >
                        CALENDARIO DE CLASES
                    </button>
                    
                    <button
                        onClick={() => navigate('/pagos')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${isActive('/pagos') ? 'bg-cyan-50 text-cyan-600' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'}`}
                    >
                        CONTROL DE PAGOS
                    </button>

                </div>

                <div className="flex items-center gap-4">
                    <div className="flex flex-col text-right hidden sm:flex">
                        <span className="text-xs font-bold text-gray-800">{user?.nombreCompleto || 'Usuario'}</span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{user?.rol}</span>
                    </div>
                    
                    <button
                        onClick={handleLogout}
                        className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-xl transition-colors title='Cerrar Sesión'"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
                        </svg>
                    </button>
                </div>

            </div>
        </nav>
    );
}