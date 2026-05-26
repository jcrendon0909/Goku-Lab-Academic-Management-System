import { Navbar } from '../components/Navbar';

const userStorage = localStorage.getItem('user');
const userLogueado = userStorage ? JSON.parse(userStorage) : null;
const esAdmin = userLogueado?.rol === 'admin';

import React, { useEffect, useState } from 'react';
import { PaymentRow } from '../components/PaymentRow';
import { RegisterPaymentModal } from '../components/RegisterPaymentModal';
import { getPagosConEstatus, registrarAbono, actualizarDiaPago } from '../../services/api';
import { toast } from "sonner";

export function PagosPage() {
    const [pagos, setPagos] = useState<any[]>([]);
    const [cargando, setCargando] = useState(true);
    const [vista, setVista] = useState<'control' | 'registro'>('control');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState<any>(null);

    // ESTADOS PARA LOS FILTROS
    const [busquedaAlumno, setBusquedaAlumno] = useState('');
    const [fechaInicio, setFechaInicio] = useState('');
    const [fechaFin, setFechaFin] = useState('');
    const [criterioFechaPagados, setCriterioFechaPagados] = useState<'limite' | 'real'>('real');

    const cargarDatos = () => {
        setCargando(true);
        getPagosConEstatus()
            .then((data) => {
                setPagos(data);
                setCargando(false);
            })
            .catch((err) => {
                console.error("Error al traer pagos:", err);
                setCargando(false);
            });
    };

    useEffect(() => {
        cargarDatos();
    }, []);

    useEffect(() => {
        setBusquedaAlumno('');
        setFechaInicio('');
        setFechaFin('');
    }, [vista]);

    const handleChangeDate = async (pago: any) => {
        const nuevoDia = window.prompt(`Nuevo dia de pago para ${pago.nombreAlumno} (1-31):`, "1");

        if (nuevoDia && !isNaN(Number(nuevoDia))) {
            const diaNum = Number(nuevoDia);
            if (diaNum < 1 || diaNum > 31) return toast.error("Dia invalido");

            try {
                await actualizarDiaPago(pago.id, diaNum);
                toast.success("Dia de pago actualizado");
                cargarDatos();
            } catch (error) {
                toast.error("Error al cambiar la fecha");
            }
        }
    };

    const handleConfirmarPago = async (pagoId: string, monto: number, metodo: string) => {
        try {
            await registrarAbono({
                pagoId: pagoId,
                montoAbono: monto,
                nombreAlumno: selectedPayment?.nombreAlumno || "",
                metodoAbono: metodo
            });

            toast.success("Pago registrado correctamente");
            setIsModalOpen(false);
            cargarDatos();
        } catch (error: any) {
            toast.error("Error al registrar: " + error.message);
        }
    };

    const pagosFiltrados = pagos
        .filter(p => {
            if (vista === 'control') return p.activo !== false && p.status !== "Pagado";
            return p.status === "Pagado" || (p.activo === false && Number(p.montoPagado || 0) > 0);
        })
        .filter(p => {
            if (!busquedaAlumno) return true;
            return p.nombreAlumno?.toLowerCase().includes(busquedaAlumno.toLowerCase());
        })
        .filter(p => {
            if (!fechaInicio && !fechaFin) return true;

            let fechaEvaluarTexto = p.fechaLimite;
            if (vista === 'registro') {
                fechaEvaluarTexto = criterioFechaPagados === 'real' ? p.fechaPagoReal : p.fechaLimite;
            }

            if (!fechaEvaluarTexto) return false;

            const fechaEvaluar = new Date(fechaEvaluarTexto + 'T00:00:00').getTime();
            const inicio = fechaInicio ? new Date(fechaInicio + 'T00:00:00').getTime() : -Infinity;
            const fin = fechaFin ? new Date(fechaFin + 'T00:00:00').getTime() : Infinity;

            return fechaEvaluar >= inicio && fechaEvaluar <= fin;
        })
        .sort((a, b) => {
            if (vista === 'control') {
                const fechaA = a.fechaLimite ? new Date(a.fechaLimite).getTime() : 0;
                const fechaB = b.fechaLimite ? new Date(b.fechaLimite).getTime() : 0;
                return fechaA - fechaB;
            } else {
                const fechaA = a.fechaPagoReal ? new Date(a.fechaPagoReal).getTime() : 0;
                const fechaB = b.fechaPagoReal ? new Date(b.fechaPagoReal).getTime() : 0;
                return fechaB - fechaA;
            }
        });

    if (cargando) return <div className="p-10 text-center">Cargando informacion...</div>;

    const hoy = new Date();
    const mesActual = hoy.getMonth();
    const anioActual = hoy.getFullYear();

    const totalPorRecolectar = pagos
        .filter(p => {
            if (p.activo === false) return false;
            if (p.status === "Pagado") return false;
            const fecha = new Date(p.fechaLimite);
            return fecha.getMonth() === mesActual && fecha.getFullYear() === anioActual;
        })
        .reduce((sum, p) => sum + p.montoTotal, 0);

    const totalRecolectado = pagos
        .filter(p => {
            if (p.status !== "Pagado" || !p.fechaPagoReal) return false;
            const fecha = new Date(p.fechaPagoReal);
            return fecha.getMonth() === mesActual && fecha.getFullYear() === anioActual;
        })
        .reduce((sum, p) => sum + p.montoTotal, 0);

    return (
        <div className="bg-gray-50 min-h-screen w-full">
            <Navbar />

            <header className="relative overflow-hidden border-b border-cyan-100 bg-[linear-gradient(120deg,#eefbff_0%,#d9f3ff_48%,#8fd6f3_100%)] px-6 py-5 shadow-sm">
                <div className="absolute right-10 top-0 h-24 w-24 rounded-full border-[18px] border-white/40" />

                <div className="relative mx-auto flex w-full max-w-none items-center justify-between gap-6 px-4 lg:px-10">
                    <div className="flex min-w-0 items-center gap-4">
                        <img
                            src="/logo-goku-lab.png"
                            alt="Goku Lab"
                            className="h-20 w-20 flex-shrink-0 object-contain drop-shadow-md"
                        />

                        <div className="min-w-0">
                            <h1 className="text-3xl font-black leading-none text-[#0078D7]">
                                Goku Lab
                            </h1>
                            <p className="mt-1 text-base font-black leading-tight">
                                <span className="text-[#FFC400]">Juega, </span>
                                <span className="text-[#EF2D2D]">Aprende </span>
                                <span className="text-[#0078D7]">y </span>
                                <span className="text-[#2FB34A]">Emprende</span>
                            </p>
                            <p className="mt-1 text-sm font-black text-[#003B73]">
                                Sistema de Gestión Académica
                            </p>
                        </div>
                    </div>

                    <div className="flex rounded-xl border border-cyan-100 bg-white/80 p-1 shadow-sm">
                        <button
                            onClick={() => setVista('control')}
                            className={`rounded-lg px-6 py-2 text-xs font-black transition-all ${vista === 'control'
                                    ? 'bg-[#0047B8] text-white shadow-md shadow-blue-900/15'
                                    : 'text-gray-500 hover:bg-cyan-50 hover:text-cyan-700'
                                }`}
                        >
                            PENDIENTES
                        </button>
                        <button
                            onClick={() => setVista('registro')}
                            className={`rounded-lg px-6 py-2 text-xs font-black transition-all ${vista === 'registro'
                                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-900/15'
                                    : 'text-gray-500 hover:bg-emerald-50 hover:text-emerald-700'
                                }`}
                        >
                            PAGADOS
                        </button>
                    </div>
                </div>
            </header>

            <div className="max-w-6xl mx-auto space-y-6 py-8 px-4 lg:px-0">

                {/* BARRA DE FILTROS */}
                <div className="bg-white border rounded-2xl p-5 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    {/* Filtro: Alumno */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Buscar Alumno</label>
                        <input
                            type="text"
                            placeholder="Escribe el nombre..."
                            value={busquedaAlumno}
                            onChange={(e) => setBusquedaAlumno(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-xs font-semibold focus:outline-none focus:border-cyan-400 transition-colors"
                        />
                    </div>

                    {/* Filtro: Fecha Inicio */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Desde fecha</label>
                        <input
                            type="date"
                            value={fechaInicio}
                            onChange={(e) => setFechaInicio(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-xs font-semibold focus:outline-none focus:border-cyan-400 text-gray-700 transition-colors"
                        />
                    </div>

                    {/* Filtro: Fecha Fin */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Hasta fecha</label>
                        <input
                            type="date"
                            value={fechaFin}
                            onChange={(e) => setFechaFin(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-xs font-semibold focus:outline-none focus:border-cyan-400 text-gray-700 transition-colors"
                        />
                    </div>

                    {/* Filtro: Criterio para Pagados */}
                    {vista === 'registro' ? (
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Filtrar Historial por</label>
                            <select
                                value={criterioFechaPagados}
                                onChange={(e) => setCriterioFechaPagados(e.target.value as 'limite' | 'real')}
                                className="w-full bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2 text-xs font-bold text-emerald-800 focus:outline-none transition-colors"
                            >
                                <option value="real">📅 FECHA DE PAGO REAL</option>
                                <option value="limite">⏳ FECHA QUE DEBIÓ PAGAR</option>
                            </select>
                        </div>
                    ) : (
                        <button
                            onClick={() => { setBusquedaAlumno(''); setFechaInicio(''); setFechaFin(''); }}
                            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl py-2 text-xs font-bold transition-colors h-[34px]"
                        >
                            Limpiar Filtros
                        </button>
                    )}
                </div>

                {/* TARJETAS DE TOTALES DEL MES */}
                <div>
                    {vista === 'control' ? (
                        <div className="bg-cyan-50 border border-cyan-100 rounded-2xl p-5 flex items-center justify-between max-w-sm shadow-sm">
                            <div>
                                <span className="text-[10px] font-bold text-cyan-600 uppercase tracking-wider">Por recolectar en el mes</span>
                                <h2 className="text-2xl font-black text-cyan-900 mt-1">
                                    ${totalPorRecolectar.toLocaleString('es-MX')}
                                </h2>
                            </div>
                            <span className="text-3xl bg-white p-2 rounded-xl shadow-sm border border-cyan-50">📅</span>
                        </div>
                    ) : (
                        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 flex items-center justify-between max-w-sm shadow-sm">
                            <div>
                                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Total recolectado del mes</span>
                                <h2 className="text-2xl font-black text-emerald-900 mt-1">
                                    ${totalRecolectado.toLocaleString('es-MX')}
                                </h2>
                            </div>
                            <span className="text-3xl bg-white p-2 rounded-xl shadow-sm border border-emerald-50">💰</span>
                        </div>
                    )}
                </div>

                {/* CONTENEDOR DE LA LISTA */}
                <div className="flex flex-col gap-4">
                    {pagosFiltrados.length > 0 ? (
                        pagosFiltrados.map((p) => (
                            <PaymentRow
                                key={p.id}
                                payment={p}
                                onRegisterPayment={() => {
                                    setSelectedPayment(p);
                                    setIsModalOpen(true);
                                }}
                                onChangePaymentDate={() => handleChangeDate(p)}
                            />
                        ))
                    ) : (
                        <div className="py-20 text-center bg-white rounded-2xl border-2 border-dashed border-gray-200 shadow-sm">
                            <p className="text-gray-400 font-medium">No se encontraron registros con los filtros aplicados.</p>
                        </div>
                    )}
                </div>

                {/* Modal de Registro */}
                {isModalOpen && selectedPayment && (
                    <RegisterPaymentModal
                        payment={selectedPayment}
                        onClose={() => setIsModalOpen(false)}
                        onConfirm={handleConfirmarPago}
                    />
                )}
            </div>
        </div>
    );
}