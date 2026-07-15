import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginService } from '../../services/api';
import { rutaInicialPorRol } from '../../utils/roles';

export function LoginPage() {
    const [usuario, setUsuario] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [cargando, setCargando] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setCargando(true);
        try {
            const data = await loginService(usuario, password);
            const ruta = rutaInicialPorRol(data.user.rol);
            navigate(ruta);
        } catch (err: any) {
            setError(err.message || 'Error al iniciar sesión');
        } finally {
            setCargando(false);
        }
    };

    return (
        <div className="relative min-h-screen flex items-center justify-center bg-gray-100 overflow-hidden">
            {/* Video de fondo - opacidad muy baja (0.15) y sin interacción */}
            <video
                autoPlay
                loop
                muted
                playsInline
                className="absolute inset-0 w-full h-full object-cover opacity-15 pointer-events-none"
                poster="https://media.gokulab.mx/Galery/videos/cloudyanimado-poster.jpg"
            >
                <source
                    src="https://media.gokulab.mx/Galery/videos/cloudyanimado.mp4"
                    type="video/mp4"
                />
                {/* Fallback: gradiente sutil si el video no carga */}
            </video>

            {/* Overlay para mejorar legibilidad */}
            <div className="absolute inset-0 bg-white/30 backdrop-blur-[2px]" />

            {/* Contenido del login (se mantiene encima del video) */}
            <div className="relative z-10 bg-white/90 backdrop-blur-sm p-8 rounded-2xl shadow-2xl w-96 border border-white/20">
                <div className="text-center mb-6">
                    <h1 className="text-3xl font-bold text-gray-800" style={{ fontFamily: "'Poppins', sans-serif" }}>
                        GōkuLab
                    </h1>
                    <p className="text-sm text-gray-500">Juega, Aprende y Emprende</p>
                </div>

                {error && (
                    <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Usuario
                        </label>
                        <input
                            type="text"
                            value={usuario}
                            onChange={(e) => setUsuario(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#26AAA3] focus:border-transparent transition"
                            required
                            disabled={cargando}
                        />
                    </div>
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Contraseña
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#26AAA3] focus:border-transparent transition"
                            required
                            disabled={cargando}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={cargando}
                        className="w-full bg-[#26AAA3] text-white py-2 rounded-lg hover:bg-[#1f8c86] transition disabled:opacity-50 font-medium"
                    >
                        {cargando ? 'Iniciando sesión...' : 'Iniciar sesión'}
                    </button>
                </form>
            </div>
        </div>
    );
}