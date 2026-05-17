import React, { useState } from 'react';
import { toast } from 'sonner';
// Si usas react-router-dom para la navegación
// import { useNavigate } from 'react-router-dom'; 

export function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [cargando, setCargando] = useState(false);

    // const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setCargando(true);

        try {
            // Aquí iría tu llamada al backend: await login({ email, password });
            console.log("Iniciando sesión con:", { email, password });

            toast.success("¡Bienvenido al sistema!");
            // navigate('/pagos'); 
        } catch (error) {
            toast.error("Credenciales incorrectas");
        } finally {
            setCargando(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">

                {/* Encabezado con estilo Cian/Azul */}
                <div className="bg-white p-8 pb-4 text-center">
                    <div className="w-16 h-16 bg-cyan-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-cyan-100">
                        <span className="text-3xl"> </span>
                    </div>
                    <h2 className="text-3xl font-extrabold text-gray-800">Inicio de sesión</h2>
                    <p className="text-gray-500 text-sm mt-2 font-medium uppercase tracking-wider">Acceso</p>
                </div>

                <form onSubmit={handleSubmit} className="p-8 pt-4 space-y-5">
                    {/* Campo: Email */}
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-cyan-600 uppercase ml-1">Usuario</label>
                        <input
                            type="text"
                            required
                            autoComplete="username"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="User123"
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 transition-all outline-none text-sm text-gray-700"
                        />
                    </div>

                    {/* Campo: Password */}
                    <div className="space-y-1">
                        <div className="flex justify-between items-center px-1">
                            <label className="text-[10px] font-bold text-cyan-600 uppercase">Contraseña</label>
                            <a href="#" className="text-[10px] font-bold text-gray-400 hover:text-cyan-600 transition-colors uppercase">¿Olvidaste tu clave?</a>
                        </div>
                        <input
                            type="password"
                            required
                            autoComplete="current-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 transition-all outline-none text-sm text-gray-700"
                        />
                    </div>

                    {/* Botón Principal (Mismo estilo que Registrar Abono) */}
                    <button
                        type="submit"
                        disabled={cargando}
                        className="w-full py-4 bg-yellow-400 hover:bg-yellow-500 text-yellow-950 font-bold rounded-2xl shadow-lg shadow-yellow-200 transition-all transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                    >
                        {cargando ? "Validando..." : "Entrar al Sistema"}
                    </button>

                    <div className="text-center mt-6">
                        <p className="text-[11px] text-gray-400 font-medium italic">
                            Desarrollado para la gestión escolar eficiente
                        </p>
                    </div>
                </form>
            </div>
        </div>
    );
}