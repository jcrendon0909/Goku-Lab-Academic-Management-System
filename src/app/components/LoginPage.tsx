import React, { useState } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Lock, User } from 'lucide-react';
import { loginService } from '../../services/api';
import { rutaInicialPorRol } from '../../utils/auth';

export function LoginPage() {
    const [usuario, setUsuario] = useState('');
    const [password, setPassword] = useState('');
    const [cargando, setCargando] = useState(false);

    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setCargando(true);

        try {
            const data = await loginService(usuario, password);
            toast.success('Bienvenido al sistema');
            navigate(rutaInicialPorRol(data?.user?.rol));
        } catch (error: any) {
            toast.error(error.message || 'Credenciales incorrectas');
        } finally {
            setCargando(false);
        }
    };

    return (
        <div className="min-h-screen bg-[linear-gradient(135deg,#e9f8ff_0%,#f8fcff_45%,#e7f7ff_100%)] px-4 py-8 flex items-center justify-center">
            <div className="absolute inset-x-0 top-0 h-2 bg-[linear-gradient(90deg,#009FE3,#FFC400,#EF2D2D,#2FB34A)]" />

            <div className="w-full max-w-[980px] overflow-hidden rounded-2xl border border-cyan-100 bg-white shadow-2xl shadow-cyan-900/10">
                <div className="grid min-h-[620px] grid-cols-1 lg:grid-cols-[0.95fr_1.05fr]">
                    <section className="relative hidden overflow-hidden bg-[linear-gradient(140deg,#dff6ff_0%,#bcecff_52%,#75ccef_100%)] p-10 lg:flex lg:flex-col lg:justify-between">
                        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full border-[28px] border-white/35" />
                        <div className="absolute -bottom-24 left-10 h-64 w-64 rounded-full bg-white/20" />

                        <div className="relative">
                            <img
                                src="/logo-goku-lab.png"
                                alt="Goku Lab"
                                className="h-32 w-32 object-contain drop-shadow-xl"
                            />

                            <div className="mt-8">
                                <h1 className="text-4xl font-black leading-tight text-[#0078D7]">
                                    Goku Lab
                                </h1>
                                <p className="mt-3 text-lg font-black leading-tight">
                                    <span className="text-[#FFC400]">Juega, </span>
                                    <span className="text-[#EF2D2D]">Aprende </span>
                                    <span className="text-[#0078D7]">y </span>
                                    <span className="text-[#2FB34A]">Emprende</span>
                                </p>
                                <p className="mt-4 max-w-sm text-sm font-semibold leading-6 text-[#003B73]">
                                    Sistema de gestión académica para calendario de clases,
                                    alumnos y control de pagos.
                                </p>
                            </div>
                        </div>

                        <div className="relative grid grid-cols-3 gap-3">
                            <div className="h-2 rounded-full bg-[#FFC400]" />
                            <div className="h-2 rounded-full bg-[#EF2D2D]" />
                            <div className="h-2 rounded-full bg-[#2FB34A]" />
                        </div>
                    </section>

                    <section className="flex items-center justify-center p-6 sm:p-10">
                        <div className="w-full max-w-md">
                            <div className="mb-8 text-center lg:hidden">
                                <img
                                    src="/logo-goku-lab.png"
                                    alt="Goku Lab"
                                    className="mx-auto h-28 w-28 object-contain drop-shadow-lg"
                                />
                            </div>

                            <div className="mb-8">
                                <p className="text-xs font-black uppercase tracking-[0.28em] text-cyan-600">
                                    Acceso administrativo
                                </p>
                                <h2 className="mt-3 text-4xl font-black leading-tight text-gray-900">
                                    Inicio de sesión
                                </h2>
                                <p className="mt-3 text-sm font-medium text-gray-500">
                                    Ingresa con tus credenciales para continuar.
                                </p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-wide text-cyan-700">
                                        Usuario
                                    </label>
                                    <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 transition-colors focus-within:border-cyan-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-cyan-100">
                                        <User className="h-5 w-5 text-cyan-600" />
                                        <input
                                            type="text"
                                            required
                                            autoComplete="username"
                                            value={usuario}
                                            onChange={(e) => setUsuario(e.target.value)}
                                            placeholder="nombre.apellido"
                                            className="h-14 w-full bg-transparent text-sm font-medium text-gray-800 outline-none placeholder:text-gray-400"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-black uppercase tracking-wide text-cyan-700">
                                            Contraseña
                                        </label>
                                        <span className="text-[11px] font-bold uppercase text-gray-400">
                                            Soporte interno
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 transition-colors focus-within:border-cyan-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-cyan-100">
                                        <Lock className="h-5 w-5 text-cyan-600" />
                                        <input
                                            type="password"
                                            required
                                            autoComplete="current-password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="••••••••"
                                            className="h-14 w-full bg-transparent text-sm font-medium text-gray-800 outline-none placeholder:text-gray-400"
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={cargando}
                                    className="group mt-2 flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#0047B8] px-5 text-sm font-black text-white shadow-lg shadow-blue-900/20 transition-all hover:bg-[#003A96] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {cargando ? 'Validando...' : 'Entrar al sistema'}
                                    {!cargando && (
                                        <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
                                    )}
                                </button>
                            </form>

                            <div className="mt-8 rounded-xl border border-cyan-100 bg-cyan-50/70 p-4">
                                <p className="text-center text-xs font-semibold text-cyan-800">
                                    Calendario de clases y control de pagos en un solo lugar.
                                </p>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
