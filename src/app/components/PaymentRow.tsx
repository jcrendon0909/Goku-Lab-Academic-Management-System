import * as React from "react";

const formatearFecha = (fechaIso: string) => {
    if (!fechaIso) return "Sin fecha";
    const opciones: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
    return new Date(fechaIso).toLocaleDateString('es-ES', opciones);
};

const formatearMonto = (monto: number) => {
    return Number(monto || 0).toLocaleString('es-MX');
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
    const esProgramado = payment.status === "Programado" || payment.cobroProgramado;
    const periodosRaw = payment.periodosMensuales || [];
    const periodos = (() => {
        if (!esProgramado) return periodosRaw;
        const programados = periodosRaw.filter(
            (mes: { status?: string }) => mes.status === "Programado"
        );
        if (programados.length <= 1) return periodosRaw;
        const primeraClave = programados[0]?.clave;
        return periodosRaw.filter(
            (mes: { status?: string; clave?: string }) =>
                mes.status !== "Programado" || mes.clave === primeraClave
        );
    })();
    const vencido = !esProgramado && estaVencido(payment.fechaLimite, payment.status);

    return (
        <div className="rounded-xl border bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-8 flex-1 flex-wrap">

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
                    <span className="text-sm font-bold">${formatearMonto(payment.montoTotal)}</span>
                </div>
                {!isPaid && (
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-emerald-500 uppercase">Abonado</span>
                        <span className="text-sm font-bold text-emerald-600">${formatearMonto(payment.montoPagado)}</span>
                    </div>
                )}
                {!isPaid && (
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-red-400 uppercase">Adeudo</span>
                        <span className="text-sm font-bold text-red-500">${formatearMonto(payment.saldo)}</span>
                    </div>
                )}
                {payment.mesCobroVigente && (
                    <div className="flex flex-col min-w-[120px]">
                        <span className="text-[10px] font-bold text-cyan-600 uppercase">Mes</span>
                        <span className="text-sm font-bold text-gray-900 capitalize">
                            {payment.mesCobroVigente}
                        </span>
                    </div>
                )}

                {/* Estatus */}
                <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase border ${
                    isPaid
                      ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                      : esProgramado
                        ? "bg-sky-50 text-sky-700 border-sky-200"
                        : "bg-amber-50 text-amber-600 border-amber-100"
                }`}>
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

            {!isPaid && !esProgramado && (
                <button
                    onClick={onChangePaymentDate}
                    className="px-4 py-2 bg-cyan-100 hover:bg-cyan-500 text-yellow-950 text-xs font-bold rounded-lg transition-all whitespace-nowrap"
                >
                    Cambiar dia de pago
                </button>
            )}
            {!isPaid && !esProgramado && (
                <button
                    onClick={onRegisterPayment}
                    className="px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-yellow-950 text-xs font-bold rounded-lg transition-all whitespace-nowrap"
                >
                    Registrar Abono
                </button>
            )}
            </div>

            {periodos.length > 0 && (
                <div className="border-t border-gray-100 pt-3">
                    <p className="text-[10px] font-bold text-gray-500 uppercase mb-2">
                        Pagos por mes
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {periodos.map((mes: any) => (
                            <div
                                key={mes.clave}
                                className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-xs"
                            >
                                <div className="font-semibold text-gray-800 capitalize">
                                    {mes.nombreMes}
                                </div>
                                <div className="text-gray-500 mt-1">
                                    Vence: {formatearFecha(mes.vencimiento)}
                                </div>
                                <div className="mt-1 flex justify-between gap-2">
                                    <span>${formatearMonto(mes.pagado)} / ${formatearMonto(mes.monto)}</span>
                                    <span className={`font-bold uppercase ${
                                        mes.status === "Pagado"
                                          ? "text-emerald-600"
                                          : mes.status === "Programado"
                                            ? "text-sky-600"
                                            : "text-amber-600"
                                    }`}>
                                        {mes.status}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
