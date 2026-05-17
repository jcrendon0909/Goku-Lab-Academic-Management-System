import * as React from "react";

const formatearFecha = (fechaIso: string) => {
    if (!fechaIso) return "Sin fecha";
    const opciones: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
    return new Date(fechaIso).toLocaleDateString('es-ES', opciones);
};

const estaVencido = (fechaIso: string, status: string) => {
    if (!fechaIso) return false;
    const hoy = new Date();
    const limite = new Date(fechaIso);
    return limite < hoy && status !== "Pagado";
};

interface PaymentRowProps {
    payment: any;
    onRegisterPayment: () => void;
    onChangePaymentDate: () => void;
}

export function PaymentRow({ payment, onRegisterPayment, onChangePaymentDate }) {
    const isPaid = payment.status === "Pagado";
    // Verificamos si este pago en particular está vencido
    const vencido = estaVencido(payment.fechaLimite, payment.status);

    return (
        <div className="rounded-xl border bg-white p-6 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-8 flex-1">

                {/* FECHA 1: Cambia el título dinámicamente */}
                <div className="flex flex-col min-w-[120px]">
                    <span className="text-[10px] font-bold text-cyan-600 uppercase">
                        {isPaid ? "Debio pagar" : "Fecha de pago"}
                    </span>
                    <span className={`text-sm font-bold ${vencido ? 'text-red-500' : 'text-gray-900'}`}>
                        {formatearFecha(payment.fechaLimite)}
                    </span>
                </div>

                {/* FECHA 2: Cuándo pagó realmente */}
                {isPaid && (
                    <div className="flex flex-col min-w-[120px]">
                        <span className="text-[10px] font-bold text-emerald-600 uppercase">Pago</span>
                        <span className="text-sm font-bold text-gray-900">
                            {formatearFecha(payment.fechaPagoReal)}
                        </span>
                    </div>
                )}

                {/* Alumno */}
                <div className="flex flex-col min-w-[150px]">
                    <span className="text-[10px] font-bold text-cyan-600 uppercase">Alumno</span>
                    <span className="text-sm font-bold text-gray-900">{payment.nombreAlumno}</span>
                </div>

                {/* Curso */}
                <div className="flex flex-col min-w-[150px]">
                    <span className="text-[10px] font-bold text-cyan-600 uppercase">Curso</span>
                    <span className="text-sm font-bold text-gray-600">{payment.nombreCurso}</span>
                </div>

                {/* Montos */}
                <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Total</span>
                    <span className="text-sm font-bold">${payment.montoTotal}</span>
                </div>
                {!isPaid && (
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-emerald-500 uppercase">Abonado</span>
                        <span className="text-sm font-bold text-emerald-600">${payment.montoPagado}</span>
                    </div>
                )}
                {!isPaid && (
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-red-400 uppercase">Adeudo</span>
                        <span className="text-sm font-bold text-red-500">${payment.saldo}</span>
                    </div>
                )}
                {/* Estatus */}
                <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase border ${isPaid ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-600 border-amber-100"}`}>
                    {payment.status}
                </div>

                {/* Método pago */}
                {isPaid && (
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-cyan-600 uppercase">Metodo</span>
                        <span className="text-sm font-bold text-gray-600">{payment.metodoAbono}</span>
                    </div>
                )}
            </div>

            {!isPaid && (
                <button
                    onClick={onChangePaymentDate}
                    className="px-4 py-2 bg-cyan-100 hover:bg-cyan-500 text-yellow-950 text-xs font-bold rounded-lg transition-all whitespace-nowrap"
                >
                    Cambiar dia de pago
                </button>
            )
            }
            {!isPaid && (
                <button
                    onClick={onRegisterPayment}
                    className="px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-yellow-950 text-xs font-bold rounded-lg transition-all whitespace-nowrap"
                >
                    Registrar Abono
                </button>
            )}
        </div>
    );
}