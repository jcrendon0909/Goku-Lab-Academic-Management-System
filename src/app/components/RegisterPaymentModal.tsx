import React, { useState } from 'react';
import { toast } from 'sonner';

interface RegisterPaymentModalProps {
    payment: any;
    onClose: () => void;
    onConfirm: (
        pagoId: string,
        monto: number,
        metodo: string,
        fechaAbono: string,
        idAlumno: string,
        grupoId: string,
        nombreAlumno: string,
        nuevoMontoMensual?: number,
        esDescuento?: boolean,
        descuentoPorcentaje?: number,
        mesesCubiertos?: number,
        aplicaSaldoAFavor?: boolean
    ) => void;
}

export function RegisterPaymentModal({ payment, onClose, onConfirm }: RegisterPaymentModalProps) {
    const [monto, setMonto] = useState<number | string>(payment.saldo || 0);
    const [metodo, setMetodo] = useState<string>('Efectivo');
    const [fechaAbono, setFechaAbono] = useState<string>(new Date().toISOString().substring(0, 10));

    // ===== NUEVOS ESTADOS =====
    const [esDescuento, setEsDescuento] = useState<boolean>(false);
    const [descuentoPorcentaje, setDescuentoPorcentaje] = useState<number>(0);
    const [mesesCubiertos, setMesesCubiertos] = useState<number>(1);
    const [aplicaSaldoAFavor, setAplicaSaldoAFavor] = useState<boolean>(false);

    const [cambiarTarifa, setCambiarTarifa] = useState<boolean>(false);
    const [nuevoMonto, setNuevoMonto] = useState<number | string>(payment.montoTotal || 0);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const montoAbono = Number(monto);
        if (isNaN(montoAbono) || montoAbono <= 0) return;

        const tarifaFutura = cambiarTarifa ? Number(nuevoMonto) : undefined;

        const pagoId = payment.pagoId || payment.id || payment._id;
        if (!pagoId) {
            toast.error('El pago no tiene un identificador válido.');
            return;
        }

        // ✅ Si es descuento, validar que el porcentaje sea válido
        if (esDescuento && (descuentoPorcentaje <= 0 || descuentoPorcentaje > 100)) {
            toast.error('El porcentaje de descuento debe ser entre 1 y 100');
            return;
        }

        onConfirm(
            pagoId,
            montoAbono,
            metodo,
            fechaAbono,
            payment.idAlumno,
            payment.grupoId,
            payment.nombreAlumno,
            tarifaFutura,
            esDescuento,
            esDescuento ? descuentoPorcentaje : 0,
            mesesCubiertos,
            aplicaSaldoAFavor
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
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
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
                    {/* Monto */}
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

                    {/* ===== NUEVAS OPCIONES: DESCUENTO Y SALDO A FAVOR ===== */}
                    <div className="border-t border-gray-100 pt-4 space-y-3">
                        <div className="flex items-center gap-3">
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={esDescuento}
                                    onChange={(e) => setEsDescuento(e.target.checked)}
                                    className="w-4 h-4 text-cyan-600 rounded border-gray-300 focus:ring-cyan-500"
                                />
                                <span className="text-xs font-bold text-gray-700 group-hover:text-cyan-700 transition-colors">
                                    Es un descuento
                                </span>
                            </label>
                            {esDescuento && (
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        min="1"
                                        max="100"
                                        value={descuentoPorcentaje}
                                        onChange={(e) => setDescuentoPorcentaje(Number(e.target.value))}
                                        className="w-16 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-sm font-bold text-gray-900 focus:outline-none focus:border-cyan-500"
                                    />
                                    <span className="text-xs text-gray-500">%</span>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-3">
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={aplicaSaldoAFavor}
                                    onChange={(e) => setAplicaSaldoAFavor(e.target.checked)}
                                    className="w-4 h-4 text-green-600 rounded border-gray-300 focus:ring-green-500"
                                />
                                <span className="text-xs font-bold text-gray-700 group-hover:text-green-700 transition-colors">
                                    Genera saldo a favor
                                </span>
                            </label>
                            {aplicaSaldoAFavor && (
                                <span className="text-[10px] text-green-600 font-medium">
                                    (El excedente se acumulará para el próximo mes)
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-3">
                            <label className="text-xs font-bold text-gray-700">Meses que cubre este abono:</label>
                            <select
                                value={mesesCubiertos}
                                onChange={(e) => setMesesCubiertos(Number(e.target.value))}
                                className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-sm font-bold text-gray-900 focus:outline-none focus:border-cyan-500"
                            >
                                {[1, 2, 3, 4, 5, 6].map((n) => (
                                    <option key={n} value={n}>{n}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Switch para cambiar tarifa (existente) */}
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

                        {cambiarTarifa && (
                            <div className="mt-3 bg-purple-50 border border-purple-100 rounded-xl p-4 animate-in slide-in-from-top-2 duration-200">
                                <label className="text-[10px] font-bold text-purple-600 uppercase tracking-wider mb-1.5 block">
                                    Nueva tarifa mensual
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
                                    * Se aplicará a meses futuros a partir del siguiente mes pendiente.
                                </p>
                            </div>
                        )}
                    </div>

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