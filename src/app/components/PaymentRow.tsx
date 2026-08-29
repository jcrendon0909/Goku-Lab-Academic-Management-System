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
    vista?: 'control' | 'registro' | 'proximos';
    onRegisterPayment: (mesElegido?: any) => void;
    onChangePaymentDate: () => void;
    onPrintReceipt?: (mes: any) => void;
    onEditarAbono?: (abono: any) => void;
}

export function PaymentRow({ 
    payment, 
    vista, 
    onRegisterPayment, 
    onChangePaymentDate, 
    onPrintReceipt,
    onEditarAbono
}: PaymentRowProps) {
    const isPaid = payment.status === "Pagado" || vista === 'registro';
    const esProgramado = payment.status === "Programado" || payment.cobroProgramado;
    const periodosRaw = payment.periodosMensuales || [];

    const hoy = new Date();
    const totalMesesHoy = hoy.getFullYear() * 12 + hoy.getMonth();

    const sumMontoReal = periodosRaw.reduce((sum: number, m: any) => {
        if (!m.vencimiento || m.status === "Programado") return sum;
        const v = new Date(m.vencimiento);
        const totalMesesVence = v.getFullYear() * 12 + v.getMonth();
        if (totalMesesVence <= totalMesesHoy) {
            return sum + (m.monto || 0);
        }
        return sum;
    }, 0);

    const totalGlobalMonto = periodosRaw.length > 0 ? sumMontoReal : (payment.montoTotal || 0);
    const totalGlobalPagado = periodosRaw.reduce((sum: number, m: any) => sum + (m.pagado || 0), 0) || payment.montoPagado || 0;
    const totalGlobalAdeudo = Math.max(0, totalGlobalMonto - totalGlobalPagado);

    const mesesAMostrar = periodosRaw.filter((m: any) => {
        if (!m.vencimiento) return false;
        const v = new Date(m.vencimiento);
        const totalMesesVence = v.getFullYear() * 12 + v.getMonth();

        if (vista === 'registro') {
            return m.status === "Pagado";
        } else if (vista === 'proximos') {
            return totalMesesVence > totalMesesHoy && m.status !== "Pagado";
        } else {
            return totalMesesVence <= totalMesesHoy && m.status !== "Pagado";
        }
    });

    const primerMesPendienteIndex = periodosRaw.findIndex((m: any) =>
        m.status === "Pendiente" || m.status === "Parcial"
    );

    const vencido = !esProgramado && estaVencido(payment.fechaLimite, payment.status);

    const handleEditarAbono = (mes: any) => {
        if (!onEditarAbono) return;
        if (!mes.abonoId && !mes.pagoId) {
            alert('No se puede editar este abono porque no tiene un identificador');
            return;
        }
        const abono = {
            abonoId: mes.abonoId || `ABO-${mes.pagoId}`,
            pagoId: mes.pagoId || payment.pagoId,
            idAlumno: payment.idAlumno,
            grupoId: payment.grupoId,
            nombreAlumno: payment.nombreAlumno,
            montoAbono: mes.pagado || 0,
            fechaAbono: mes.fechaPagoReal || mes.vencimiento,
            metodoAbono: mes.metodoAbono || mes.metodoPago || 'Efectivo',
            notas: mes.notas || '',
        };
        onEditarAbono(abono);
    };

    return (
        <div className="rounded-xl border bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-6 flex-1 flex-wrap">
                    <div className="flex flex-col min-w-[120px]">
                        <span className="text-[10px] font-bold text-cyan-600 uppercase">
                            {isPaid ? "Último Pago" : "Próximo Vencimiento"}
                        </span>
                        <span className={`text-sm font-bold ${vencido ? 'text-red-500' : 'text-gray-900'}`}>
                            {formatearFecha(payment.fechaLimite)}
                        </span>
                    </div>

                    {isPaid && (
                        <>
                            <div className="flex flex-col min-w-[100px]">
                                <span className="text-[10px] font-bold text-emerald-600 uppercase">Pago Real</span>
                                <span className="text-sm font-bold text-emerald-700">
                                    {payment.fechaPagoReal ? formatearFecha(payment.fechaPagoReal) : "N/A"}
                                </span>
                            </div>
                            <div className="flex flex-col min-w-[100px]">
                                <span className="text-[10px] font-bold text-emerald-600 uppercase">Método</span>
                                <span className="text-sm font-bold text-emerald-700 capitalize">
                                    {payment.metodoAbono || payment.metodoPago || "N/A"}
                                </span>
                            </div>
                        </>
                    )}

                    <div className="flex flex-col min-w-[150px]">
                        <span className="text-[10px] font-bold text-cyan-600 uppercase">Alumno</span>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-gray-900">{payment.nombreAlumno}</span>
                            {payment.activo === false ? (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-rose-100 text-rose-700 border border-rose-200">BAJA</span>
                            ) : (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-700 border border-emerald-200">ACTIVO</span>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col min-w-[130px]">
                        <span className="text-[10px] font-bold text-cyan-600 uppercase">Curso</span>
                        <span className="text-sm font-bold text-gray-600 truncate max-w-[280px]" title={payment.nombreCurso}>
                            {payment.nombreCurso}
                        </span>
                    </div>

                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Total</span>
                        <span className="text-sm font-bold">${formatearMonto(totalGlobalMonto)}</span>
                    </div>

                    {!isPaid && (
                        <>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-emerald-500 uppercase">Abonado</span>
                                <span className="text-sm font-bold text-emerald-600">${formatearMonto(totalGlobalPagado)}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-red-400 uppercase">Adeudo Real</span>
                                <span className="text-sm font-bold text-red-500">${formatearMonto(totalGlobalAdeudo)}</span>
                            </div>
                        </>
                    )}
                </div>

                <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase border ${isPaid ? "bg-emerald-100 text-emerald-700 border-emerald-200" :
                    esProgramado ? "bg-sky-50 text-sky-700 border-sky-200" :
                        "bg-amber-50 text-amber-600 border-amber-100"
                    }`}>
                    {payment.status}
                </div>
            </div>

            {mesesAMostrar.length > 0 && (
                <div className="border-t border-gray-100 pt-3">
                    <p className="text-[10px] font-bold text-gray-500 uppercase mb-3">
                        {vista === 'registro' ? "Historial de pagos" : (vista === 'proximos' ? "Proyección de meses futuros" : "Meses pendientes")}
                    </p>

                    <div className="max-h-[260px] overflow-y-auto pr-2 custom-scrollbar">
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 pb-2">
                            {mesesAMostrar.map((mes: any) => {
                                const esPagado = mes.status === "Pagado";
                                const indiceReal = periodosRaw.indexOf(mes);
                                const estaBloqueado = indiceReal > primerMesPendienteIndex && primerMesPendienteIndex !== -1;

                                // ✅ CORRECCIÓN: Forzar el monto correcto si el mes está pagado y el monto es mayor que el pagado
                                let montoMostrar = mes.monto;
                                if (esPagado && mes.pagado > 0 && mes.pagado < mes.monto) {
                                    montoMostrar = mes.pagado;
                                }

                                return (
                                    <div key={mes.clave} className={`flex flex-col justify-between rounded-lg border px-4 py-3 text-xs ${esPagado ? 'border-emerald-100 bg-emerald-50/30' : 'border-gray-100 bg-gray-50'}`}>
                                        <div>
                                            <div className="flex justify-between items-start">
                                                <div className="font-bold text-gray-900 capitalize text-sm">{mes.nombreMes}</div>
                                                <div className="flex items-center gap-1">
                                                    {esPagado && onEditarAbono && (
                                                        <button
                                                            onClick={() => handleEditarAbono(mes)}
                                                            className="text-purple-600 hover:text-purple-800 transition-colors p-1"
                                                            title="Editar este abono"
                                                        >
                                                            ✏️
                                                        </button>
                                                    )}
                                                    {mes.pagado > 0 && onPrintReceipt && (
                                                        <button
                                                            onClick={() => onPrintReceipt(mes)}
                                                            className="text-emerald-600 bg-emerald-100 hover:bg-emerald-200 px-2 py-1 rounded-md transition-colors font-bold text-[10px]"
                                                            title="Imprimir comprobante"
                                                        >
                                                            🖨️ {mes.status === "Pagado" ? "RECIBO MES" : "RECIBO PARCIAL"}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-gray-500 mt-1">Vence: {formatearFecha(mes.vencimiento)}</div>

                                            <div className="mt-2 flex justify-between items-end border-t pt-2 font-medium">
                                                <div className="flex flex-col">
                                                    <span>${formatearMonto(mes.pagado)} / ${formatearMonto(montoMostrar)}</span>
                                                    {mes.pagado > 0 && (mes.metodoAbono || mes.metodoPago) && (
                                                        <span className="text-[9px] font-bold text-gray-400 uppercase mt-0.5">
                                                            💳 {mes.metodoAbono || mes.metodoPago}
                                                        </span>
                                                    )}
                                                </div>
                                                <span className={esPagado ? "text-emerald-600" : "text-amber-600"}>{mes.status}</span>
                                            </div>
                                        </div>

                                        {!esPagado && (
                                            <button
                                                onClick={() => {
                                                    if (!estaBloqueado) {
                                                        onRegisterPayment({
                                                            ...mes,
                                                            pagoId: mes.pagoId
                                                        });
                                                    }
                                                }}
                                                disabled={estaBloqueado}
                                                className={`mt-3 w-full rounded-md py-2 text-[10px] font-black uppercase tracking-widest transition-all ${estaBloqueado
                                                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                                                    : "bg-yellow-400 text-yellow-950 hover:bg-yellow-500 shadow-sm"
                                                    }`}
                                            >
                                                {estaBloqueado ? "Paga mes anterior" : `Abonar a ${mes.nombreMes.split(' ')[0]}`}
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}