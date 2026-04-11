import React, { useState } from "react";
import { X, DollarSign, AlertCircle, Info, CreditCard } from "lucide-react";

interface PaymentData {
    id: string;
    nombreAlumno: string;
    nombreCurso: string;
    montoTotal: number;
    montoPagado: number;
    saldo: number;
    status: string;
}

interface RegisterPaymentModalProps {
    payment: PaymentData;
    onClose: () => void;
    onConfirm: (id: string, amount: number, metodo: string) => void;
}

export function RegisterPaymentModal({ payment, onClose, onConfirm }: RegisterPaymentModalProps) {
    const [amount, setAmount] = useState<string>("");
    const [metodo, setMetodo] = useState<string>("Efectivo");
    const [error, setError] = useState<string | null>(null);

    const balance = payment.saldo;

    const handleConfirm = () => {
        const numAmount = parseFloat(amount);

        if (isNaN(numAmount) || numAmount <= 0) {
            setError("Ingrese un monto válido");
            return;
        }

        if (numAmount > balance) {
            setError(`El monto no puede ser mayor al saldo pendiente ($${balance})`);
            return;
        }

        onConfirm(payment.id, numAmount, metodo);
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <h2 className="text-lg font-bold text-gray-900">Registrar Abono</h2>
                    <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Información del Alumno */}
                    <div className="flex flex-col gap-1">
                        <span className="text-sm text-gray-500">Alumno</span>
                        <span className="text-lg font-bold text-gray-900">{payment.nombreAlumno}</span>
                        <span className="text-xs text-cyan-600 font-medium">{payment.nombreCurso}</span>
                    </div>

                    {/* Resumen de Montos */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Monto Total</span>
                            <span className="text-lg font-bold text-gray-700">${payment.montoTotal}</span>
                        </div>
                        <div className="p-4 bg-cyan-50 rounded-xl border border-cyan-100">
                            <span className="text-[10px] font-bold text-cyan-600 uppercase tracking-wider block mb-1">Saldo Pendiente</span>
                            <span className="text-lg font-bold text-cyan-700 font-mono">${balance}</span>
                        </div>
                    </div>

                    {/* Selector de Método de Pago */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Método de Pago</label>
                        <div className="relative">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                                <CreditCard className="w-5 h-5" />
                            </div>
                            <select
                                value={metodo}
                                onChange={(e) => setMetodo(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500 appearance-none"
                            >
                                <option value="Efectivo">Efectivo</option>
                                <option value="Transferencia">Transferencia</option>
                                <option value="Tarjeta">Tarjeta</option>
                            </select>
                        </div>
                    </div>

                    {/* Ingresa Monto */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Monto a abonar</label>
                        <div className="relative">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                                <DollarSign className="w-5 h-5" />
                            </div>
                            <input
                                autoFocus
                                type="number"
                                value={amount}
                                onChange={(e) => {
                                    setAmount(e.target.value);
                                    setError(null);
                                }}
                                placeholder="0.00"
                                className={`w-full pl-12 pr-4 py-4 bg-white border rounded-xl text-xl font-bold focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all ${error ? 'border-red-300 ring-1 ring-red-100' : 'border-gray-200'
                                    }`}
                            />
                        </div>
                        {error ? (
                            <p className="text-xs text-red-500 font-medium flex items-center gap-1.5 mt-2">
                                <AlertCircle className="w-3.5 h-3.5" />
                                {error}
                            </p>
                        ) : (
                            <p className="text-[11px] text-gray-400 flex items-center gap-1.5 mt-2">
                                <Info className="w-3.5 h-3.5" />
                                El estatus cambiará a {amount && parseFloat(amount) === balance ? 'Pagado' : 'Parcial'}
                            </p>
                        )}
                    </div>
                </div>

                {/* Acciones */}
                <div className="px-6 py-4 bg-gray-50 flex items-center justify-end gap-3 border-t border-gray-100">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleConfirm}
                        className="px-8 py-2.5 bg-cyan-500 hover:bg-cyan-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-cyan-500/20 transition-all active:scale-95 flex items-center gap-2"
                    >
                        Confirmar pago
                    </button>
                </div>
            </div>
        </div>
    );
}