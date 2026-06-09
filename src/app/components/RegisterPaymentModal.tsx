import React, { useState } from 'react';

interface RegisterPaymentModalProps {
    payment: any;
    onClose: () => void;
    onConfirm: (pagoId: string, monto: number, metodo: string, fechaAbono: string, nuevoMontoMensual?: number) => void;
}

export function RegisterPaymentModal({ payment, onClose, onConfirm }: RegisterPaymentModalProps) {
    const [monto, setMonto] = useState<number | string>(payment.saldo || 0);
    const [metodo, setMetodo] = useState<string>('Efectivo');
    const [fechaAbono, setFechaAbono] = useState<string>(new Date().toISOString().substring(0, 10));

    const [cambiarTarifa, setCambiarTarifa] = useState<boolean>(false);
    const [nuevoMonto, setNuevoMonto] = useState<number | string>(payment.montoTotal || 0);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const montoAbono = Number(monto);
        if (isNaN(montoAbono) || montoAbono <= 0) return;

        const tarifaFutura = cambiarTarifa ? Number(nuevoMonto) : undefined;

        // Ejecutamos onConfirm pasándole todos los datos hacia PagosPage.tsx
        onConfirm(payment.id, montoAbono, metodo, fechaAbono, tarifaFutura);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">

                {/* ENCABEZADO DEL MODAL */}
                <div className="bg-cyan-600 px-6 py-4 flex justify-between items-center">
                    <div>
                        <h2 className="text-white font-black text-lg leading-tight">
                            Registrar Abono
                        </h2>
                        <p className="text-cyan-100 text-xs font-medium mt-0.5">
                            {payment.nombreAlumno} • {payment.claveMes ? `Periodo: ${payment.claveMes}` : 'Abono Global'}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-cyan-100 hover:text-white transition-colors">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">

                    {/* SECCIÓN 1: DATOS DEL ABONO ACTUAL */}
                    <div className="space-y-4">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Monto a abonar hoy</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                                <input
                                    type="number"
                                    min="1"
                                    step="0.01"
                                    required
                                    value={monto}
                                    onChange={(e) => setMonto(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-8 pr-4 py-2.5 text-sm font-bold text-gray-900 focus:outline-none focus:border-cyan-500 transition-colors"
                                />
                            </div>
                            <p className="text-[10px] text-gray-400 font-medium text-right">
                                Saldo pendiente: ${Number(payment.saldo || 0).toLocaleString('es-MX')}
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Método</label>
                                <select
                                    value={metodo}
                                    onChange={(e) => setMetodo(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-bold text-gray-900 focus:outline-none focus:border-cyan-500 transition-colors"
                                >
                                    <option value="Efectivo">Efectivo</option>
                                    <option value="Transferencia">Transferencia</option>
                                    <option value="Tarjeta">Tarjeta</option>
                                </select>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Fecha</label>
                                <input
                                    type="date"
                                    required
                                    value={fechaAbono}
                                    onChange={(e) => setFechaAbono(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-bold text-gray-900 focus:outline-none focus:border-cyan-500 transition-colors"
                                />
                            </div>
                        </div>
                    </div>

                    {/* SECCIÓN 2: ACTUALIZAR TARIFA FUTURA (El nuevo requerimiento) */}
                    <div className="border-t border-gray-100 pt-4 mt-2">
                        <label className="flex items-center gap-3 cursor-pointer group">
                            <div className="relative">
                                <input
                                    type="checkbox"
                                    className="sr-only"
                                    checked={cambiarTarifa}
                                    onChange={(e) => setCambiarTarifa(e.target.checked)}
                                />
                                <div className={`block w-10 h-6 rounded-full transition-colors ${cambiarTarifa ? 'bg-purple-500' : 'bg-gray-200'}`}></div>
                                <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${cambiarTarifa ? 'translate-x-4' : ''}`}></div>
                            </div>
                            <span className="text-xs font-bold text-gray-700 group-hover:text-purple-700 transition-colors">
                                Cambiar mensualidad para próximos meses
                            </span>
                        </label>

                        {/* Solo se muestra si el usuario activa el switch */}
                        {cambiarTarifa && (
                            <div className="mt-3 bg-purple-50 border border-purple-100 rounded-xl p-4 animate-in slide-in-from-top-2 duration-200">
                                <label className="text-[10px] font-bold text-purple-600 uppercase tracking-wider mb-1.5 block">
                                    Nueva tarifa mensual (Aplicará a meses futuros)
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-400 font-bold">$</span>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        required={cambiarTarifa}
                                        value={nuevoMonto}
                                        onChange={(e) => setNuevoMonto(e.target.value)}
                                        className="w-full bg-white border border-purple-200 rounded-lg pl-8 pr-4 py-2 text-sm font-bold text-purple-900 focus:outline-none focus:border-purple-500 transition-colors"
                                    />
                                </div>
                                <p className="text-[9px] text-purple-500/70 font-medium mt-2 leading-tight">
                                    * Esta tarifa reemplazará el costo de colegiatura del alumno a partir del siguiente mes pendiente en su historial.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* BOTONES DE ACCIÓN */}
                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-100 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-cyan-500 hover:bg-cyan-600 shadow-sm shadow-cyan-500/20 transition-all"
                        >
                            Confirmar Abono
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}