import React, { useCallback, useEffect, useState } from 'react';
import { PaymentRow } from '../components/PaymentRow';
import { RegisterPaymentModal } from '../components/RegisterPaymentModal';
import { EditAbonoModal } from '../components/EditAbonoModal';
import { getPagosConEstatus, registrarAbono, actualizarDiaPago, editarAbono } from '../../services/api';
import { toast } from "sonner";
import { useSyncDataReload } from '../../utils/dataSync';

export function PagosPage() {
    const [pagos, setPagos] = useState<any[]>([]);
    const [cargando, setCargando] = useState(true);
    const [vista, setVista] = useState<'control' | 'registro' | 'proximos'>('control');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState<any>(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [abonoParaEditar, setAbonoParaEditar] = useState<any>(null);

    const [busquedaAlumno, setBusquedaAlumno] = useState('');
    const [fechaInicio, setFechaInicio] = useState('');
    const [fechaFin, setFechaFin] = useState('');
    const [criterioFechaPagados, setCriterioFechaPagados] = useState<'limite' | 'real'>('real');

    const cargarDatos = useCallback(() => {
        getPagosConEstatus()
            .then((data) => {
                const alumnosMap: Record<string, any> = {};

                data.forEach((pago: any) => {
                    const key = `${pago.idAlumno}-${pago.grupoId}`;
                    
                    if (!alumnosMap[key]) {
                        alumnosMap[key] = {
                            id: pago.id || pago.pagoId,
                            pagoId: pago.pagoId,
                            idAlumno: pago.idAlumno,
                            grupoId: pago.grupoId,
                            nombreAlumno: pago.nombreAlumno,
                            cursosLista: [],
                            montoTotal: 0,
                            montoPagado: 0,
                            saldo: 0,
                            activo: false,
                            fechaLimite: pago.fechaLimite,
                            fechaPagoReal: pago.fechaPagoReal,
                            metodoAbono: pago.metodoAbono,
                            periodosMap: {},
                            saldoAFavor: pago.saldoAFavor || 0
                        };
                    }

                    const alum = alumnosMap[key];

                    if (!alum.cursosLista.includes(pago.nombreCurso)) {
                        alum.cursosLista.push(pago.nombreCurso);
                    }

                    alum.montoTotal += (Number(pago.montoTotal) || 0);
                    alum.montoPagado += (Number(pago.montoPagado) || 0);
                    if (pago.activo !== false) alum.activo = true;

                    if (pago.saldoAFavor) {
                        alum.saldoAFavor = (alum.saldoAFavor || 0) + Number(pago.saldoAFavor);
                    }

                    const periodos = pago.periodosMensuales || [];
                    periodos.forEach((mes: any) => {
                        const mesKey = mes.clave;
                        if (!alum.periodosMap[mesKey]) {
                            alum.periodosMap[mesKey] = {
                                clave: mes.clave,
                                nombreMes: mes.nombreMes,
                                vencimiento: mes.vencimiento,
                                monto: 0,
                                pagado: 0,
                                saldo: 0,
                                status: "Pendiente",
                                pagoId: mes.pagoId || pago.pagoId,
                                grupoId: mes.grupoId || pago.grupoId,
                                fechaPagoReal: mes.fechaPagoReal || null
                            };
                        }
                        alum.periodosMap[mesKey].monto = (Number(mes.monto) || 0);
                        alum.periodosMap[mesKey].pagado = (Number(mes.pagado) || 0);
                        alum.periodosMap[mesKey].saldo = (Number(mes.saldo) || 0);
                        alum.periodosMap[mesKey].status = mes.status || "Pendiente";
                        alum.periodosMap[mesKey].pagoId = mes.pagoId || pago.pagoId;
                        alum.periodosMap[mesKey].grupoId = mes.grupoId || pago.grupoId;
                        alum.periodosMap[mesKey].fechaPagoReal = mes.fechaPagoReal || null;
                    });
                });

                const pagosAgrupados = Object.values(alumnosMap).map((alum: any) => {
                    const periodosMensuales = Object.values(alum.periodosMap).sort((a: any, b: any) => {
                        return new Date(a.vencimiento).getTime() - new Date(b.vencimiento).getTime();
                    });

                    let bolsaDinero = alum.montoPagado;

                    periodosMensuales.forEach((m: any) => {
                        m.pagado = 0;
                        m.saldo = m.monto;
                        m.status = "Pendiente";

                        if (bolsaDinero > 0) {
                            if (bolsaDinero >= m.monto) {
                                m.pagado = m.monto;
                                m.saldo = 0;
                                m.status = "Pagado";
                                bolsaDinero -= m.monto;
                            } else {
                                m.pagado = bolsaDinero;
                                m.saldo = m.monto - bolsaDinero;
                                m.status = "Parcial";
                                bolsaDinero = 0;
                            }
                        }
                    });

                    const tienePendientes = periodosMensuales.some((m: any) => m.status !== "Pagado");
                    alum.status = !tienePendientes ? "Pagado" : (alum.montoPagado > 0 ? "Parcial" : "Pendiente");
                    alum.saldo = alum.montoTotal - alum.montoPagado;
                    alum.periodosMensuales = periodosMensuales;
                    alum.nombreCurso = alum.cursosLista.join(", ");

                    return alum;
                });

                setPagos(pagosAgrupados);
                setCargando(false);
            })
            .catch((err) => {
                console.error("Error al traer pagos:", err);
                setCargando(false);
            });
    }, []);

    useEffect(() => {
        cargarDatos();
    }, [cargarDatos]);

    useSyncDataReload(cargarDatos);

    useEffect(() => {
        setBusquedaAlumno('');
        setFechaInicio('');
        setFechaFin('');
    }, [vista]);

    const handleConfirmarPago = async (
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
    ) => {
        try {
            await registrarAbono({
                pagoId,
                montoAbono: monto,
                nombreAlumno,
                metodoAbono: metodo,
                fechaAbono,
                idAlumno,
                grupoId,
                nuevoMontoMensual: nuevoMontoMensual || null,
                esDescuento: esDescuento || false,
                descuentoPorcentaje: descuentoPorcentaje || 0,
                mesesCubiertos: mesesCubiertos || 1,
                aplicaSaldoAFavor: aplicaSaldoAFavor || false
            });
            toast.success("Pago registrado correctamente");
            setIsModalOpen(false);
            cargarDatos();
        } catch (error: any) {
            toast.error("Error al registrar: " + error.message);
        }
    };

    const handleEditarAbono = (abono: any) => {
        setAbonoParaEditar(abono);
        setShowEditModal(true);
    };

    const handleConfirmarEdicion = async (abonoId: string, data: any) => {
        try {
            await editarAbono(abonoId, data);
            toast.success('Abono actualizado correctamente');
            await cargarDatos();
        } catch (error: any) {
            toast.error(error.message || 'Error al editar abono');
        }
    };

    const pagosFiltrados = pagos
        .filter(p => {
            const periodos = p.periodosMensuales || [];
            const hoy = new Date();
            const totalMesesHoy = hoy.getFullYear() * 12 + hoy.getMonth();

            const tienePendientesPasados = periodos.some((m: any) => {
                const v = new Date(m.vencimiento);
                return (v.getFullYear() * 12 + v.getMonth()) <= totalMesesHoy && m.status !== "Pagado";
            });

            const tieneProximosFuturos = periodos.some((m: any) => {
                const v = new Date(m.vencimiento);
                return (v.getFullYear() * 12 + v.getMonth()) > totalMesesHoy && m.status !== "Pagado";
            });

            if (vista === 'control') {
                return p.activo !== false && tienePendientesPasados;
            } else if (vista === 'registro') {
                return periodos.some((m: any) => m.status === "Pagado") || (p.activo === false && Number(p.montoPagado || 0) > 0);
            } else if (vista === 'proximos') {
                return p.activo !== false && tieneProximosFuturos;
            }
            return false;
        })
        .filter(p => !busquedaAlumno || p.nombreAlumno?.toLowerCase().includes(busquedaAlumno.toLowerCase()))
        .filter(p => {
            if (!fechaInicio && !fechaFin) return true;
            if (vista === 'control' || vista === 'proximos') {
                const pendientes = (p.periodosMensuales || []).filter((m: any) => m.status !== "Pagado" && m.status !== "Programado");
                if (pendientes.length === 0) return false;
                return pendientes.some((mes: any) => {
                    const fechaVence = mes.vencimiento ? mes.vencimiento.substring(0, 10) : "";
                    if (!fechaVence) return false;
                    if (fechaInicio && fechaVence < fechaInicio) return false;
                    if (fechaFin && fechaVence > fechaFin) return false;
                    return true;
                });
            } else {
                let fechaEvaluarTexto = criterioFechaPagados === 'real' ? p.fechaPagoReal : p.fechaLimite;
                if (!fechaEvaluarTexto) return false;
                const fechaLimpia = fechaEvaluarTexto.substring(0, 10);
                if (fechaInicio && fechaLimpia < fechaInicio) return false;
                if (fechaFin && fechaLimpia > fechaFin) return false;
                return true;
            }
        });

    if (cargando) return <div className="p-10 text-center">Cargando informacion...</div>;

    const hoy = new Date();
    const mesActual = hoy.getMonth();
    const anioActual = hoy.getFullYear();

    const totalPorRecolectar = pagos
        .filter(p => p.activo !== false)
        .reduce((sum, p) => {
            const mesEnCurso = (p.periodosMensuales || []).find((m: any) => {
                if (!m.vencimiento) return false;
                const v = new Date(m.vencimiento);
                return v.getMonth() === mesActual && v.getFullYear() === anioActual;
            });
            return sum + (mesEnCurso ? (mesEnCurso.saldo || 0) : 0);
        }, 0);

    let totalRecolectado = 0;
    if (vista === 'registro') {
        totalRecolectado = pagosFiltrados.reduce((sum, p) => {
            const periodosPagados = (p.periodosMensuales || []).filter(m => 
                m.status === "Pagado"
            );
            const sumMeses = periodosPagados.reduce((acc, m) => {
                return acc + (m.monto || 0);
            }, 0);
            return sum + sumMeses;
        }, 0);
    } else {
        totalRecolectado = pagosFiltrados.reduce((sum, p) => {
            const mesEnCurso = (p.periodosMensuales || []).find((m: any) => {
                if (!m.vencimiento) return false;
                const v = new Date(m.vencimiento);
                return v.getMonth() === mesActual && v.getFullYear() === anioActual;
            });
            return sum + (mesEnCurso ? (mesEnCurso.pagado || 0) : 0);
        }, 0);
    }

    return (
        <div className="bg-gray-50 min-h-screen w-full pt-12">
            <header className="relative overflow-hidden border-b border-cyan-100 bg-[linear-gradient(120deg,#eefbff_0%,#d9f3ff_48%,#8fd6f3_100%)] px-6 py-5 shadow-sm">
                <div className="absolute right-10 top-0 h-24 w-24 rounded-full border-[18px] border-white/40" />
                <div className="relative mx-auto flex w-full max-w-none items-center justify-between gap-6 px-4 lg:px-10">
                    <div className="flex min-w-0 items-center gap-4">
                        <img src="/logo-goku-lab.png" alt="Goku Lab" className="h-20 w-20 flex-shrink-0 object-contain drop-shadow-md" />
                        <div className="min-w-0">
                            <h1 className="text-3xl font-black leading-none text-[#0078D7]">Goku Lab</h1>
                            <p className="mt-1 text-base font-black leading-tight">
                                <span className="text-[#FFC400]">Juega, </span><span className="text-[#EF2D2D]">Aprende </span><span className="text-[#0078D7]">y </span><span className="text-[#2FB34A]">Emprende</span>
                            </p>
                            <p className="mt-1 text-sm font-black text-[#003B73]">Sistema de Gestión Académica</p>
                        </div>
                    </div>
                    <div className="flex rounded-xl border border-cyan-100 bg-white/80 p-1 shadow-sm gap-1">
                        <button onClick={() => setVista('control')} className={`rounded-lg px-6 py-2 text-xs font-black transition-all ${vista === 'control' ? 'bg-[#0047B8] text-white shadow-md shadow-blue-900/15' : 'text-gray-500 hover:bg-cyan-50 hover:text-cyan-700'}`}>PENDIENTES</button>
                        <button onClick={() => setVista('registro')} className={`rounded-lg px-6 py-2 text-xs font-black transition-all ${vista === 'registro' ? 'bg-emerald-500 text-white shadow-md shadow-emerald-900/15' : 'text-gray-500 hover:bg-emerald-50 hover:text-emerald-700'}`}>PAGADOS</button>
                        <button onClick={() => setVista('proximos')} className={`rounded-lg px-6 py-2 text-xs font-black transition-all ${vista === 'proximos' ? 'bg-purple-600 text-white shadow-md shadow-purple-900/15' : 'text-gray-500 hover:bg-purple-50 hover:text-purple-700'}`}>PRÓXIMOS</button>
                    </div>
                </div>
            </header>

            <div className="max-w-6xl mx-auto space-y-6 py-8 px-4 lg:px-0">
                <div className="bg-white border rounded-2xl p-5 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div className="flex flex-col gap-1.5"><label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Buscar Alumno</label><input type="text" placeholder="Escribe el nombre..." value={busquedaAlumno} onChange={(e) => setBusquedaAlumno(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-xs font-semibold focus:outline-none focus:border-cyan-400 transition-colors" /></div>
                    <div className="flex flex-col gap-1.5"><label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Desde fecha</label><input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-xs font-semibold focus:outline-none focus:border-cyan-400 text-gray-700 transition-colors" /></div>
                    <div className="flex flex-col gap-1.5"><label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Hasta fecha</label><input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-xs font-semibold focus:outline-none focus:border-cyan-400 text-gray-700 transition-colors" /></div>
                    {vista === 'registro' ? (
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Filtrar Historial por</label>
                            <select value={criterioFechaPagados} onChange={(e) => setCriterioFechaPagados(e.target.value as 'limite' | 'real')} className="w-full bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2 text-xs font-bold text-emerald-800 focus:outline-none transition-colors"><option value="real">📅 FECHA DE PAGO REAL</option><option value="limite">⏳ FECHA QUE DEBIÓ PAGAR</option></select>
                        </div>
                    ) : (
                        <button onClick={() => { setBusquedaAlumno(''); setFechaInicio(''); setFechaFin(''); }} className="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl py-2 text-xs font-bold transition-colors h-[34px]">Limpiar Filtros</button>
                    )}
                </div>

                <div>
                    {vista === 'control' && (
                        <div className="bg-cyan-50 border border-cyan-100 rounded-2xl p-5 flex items-center justify-between max-w-sm shadow-sm">
                            <div><span className="text-[10px] font-bold text-cyan-600 uppercase tracking-wider">Por recolectar en el mes</span><h2 className="text-2xl font-black text-cyan-900 mt-1">${totalPorRecolectar.toLocaleString('es-MX')}</h2></div>
                            <span className="text-3xl bg-white p-2 rounded-xl shadow-sm border border-cyan-50">📅</span>
                        </div>
                    )}
                    {vista === 'registro' && (
                        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 flex items-center justify-between max-w-sm shadow-sm">
                            <div><span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Total recolectado del mes</span><h2 className="text-2xl font-black text-emerald-900 mt-1">${totalRecolectado.toLocaleString('es-MX')}</h2></div>
                            <span className="text-3xl bg-white p-2 rounded-xl shadow-sm border border-emerald-50">💰</span>
                        </div>
                    )}
                </div>

                <div className="flex flex-col gap-4">
                    {pagosFiltrados.length > 0 ? (
                        pagosFiltrados.map((p) => (
                            <PaymentRow
                                key={p.id}
                                payment={p}
                                vista={vista}
                                onRegisterPayment={(mesElegido) => {
                                    const pagoId = mesElegido.pagoId || p.pagoId || p.id;
                                    const grupoId = mesElegido.grupoId || p.grupoId;

                                    console.log('🔍 Mes elegido:', mesElegido);
                                    console.log('🔍 pagoId a usar:', pagoId);
                                    console.log('🔍 grupoId a usar:', grupoId);

                                    setSelectedPayment({
                                        ...p,
                                        saldo: mesElegido.saldo,
                                        montoTotal: mesElegido.monto,
                                        id: p.id,
                                        pagoId: pagoId,
                                        idAlumno: p.idAlumno,
                                        grupoId: grupoId,
                                        nombreAlumno: p.nombreAlumno,
                                        claveMes: mesElegido.clave
                                    });
                                    setIsModalOpen(true);
                                }}
                                onChangePaymentDate={() => {}}
                                onPrintReceipt={() => {}}
                                onEditarAbono={handleEditarAbono} // 👈 Nueva prop
                            />
                        ))
                    ) : (
                        <div className="py-20 text-center bg-white rounded-2xl border-2 border-dashed border-gray-200">
                            <p className="text-gray-400 font-medium">No se encontraron registros con los filtros aplicados.</p>
                        </div>
                    )}
                </div>

                {isModalOpen && selectedPayment && (
                    <RegisterPaymentModal
                        payment={selectedPayment}
                        onClose={() => setIsModalOpen(false)}
                        onConfirm={handleConfirmarPago}
                    />
                )}

                {showEditModal && abonoParaEditar && (
                    <EditAbonoModal
                        abono={abonoParaEditar}
                        onClose={() => {
                            setShowEditModal(false);
                            setAbonoParaEditar(null);
                        }}
                        onConfirm={handleConfirmarEdicion}
                    />
                )}
            </div>
        </div>
    );
}