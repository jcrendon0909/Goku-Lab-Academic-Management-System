import React, { useCallback, useEffect, useState } from 'react';
import { PaymentRow } from '../components/PaymentRow';
import { RegisterPaymentModal } from '../components/RegisterPaymentModal';
import { EditAbonoModal } from '../components/EditAbonoModal';
import { apiFetch, registrarAbono, editarAbono } from '../../services/api';
import { toast } from "sonner";
import { useSyncDataReload } from '../../utils/dataSync';

export function PagosPage() {
    // ===== ESTADO =====
    const [pagos, setPagos] = useState<any[]>([]);
    const [cargando, setCargando] = useState(true);
    const [vista, setVista] = useState<'control' | 'registro' | 'proximos'>('control');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState<any>(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [abonoParaEditar, setAbonoParaEditar] = useState<any>(null);

    // Filtros
    const [busquedaAlumno, setBusquedaAlumno] = useState('');
    const [fechaInicio, setFechaInicio] = useState('');
    const [fechaFin, setFechaFin] = useState('');
    const [criterioFechaPagados, setCriterioFechaPagados] = useState<'limite' | 'real'>('real');

    // Paginación
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [totalItems, setTotalItems] = useState(0);
    const [limit] = useState(50);

    // Filtros de mes y año (por defecto mes/año actual)
    const [mesFiltro, setMesFiltro] = useState<number>(new Date().getMonth() + 1);
    const [anioFiltro, setAnioFiltro] = useState<number>(new Date().getFullYear());

    // Totales calculados desde el backend
    const [totales, setTotales] = useState({
        totalPorRecolectar: 0,
        totalRecolectado: 0
    });

    // ============================================================
    // CARGA DE DATOS OPTIMIZADA (CON FILTROS Y PAGINACIÓN)
    // ============================================================
    const cargarDatos = useCallback(async () => {
        try {
            setCargando(true);
            const params = new URLSearchParams();
            params.append('mes', String(mesFiltro));
            params.append('anio', String(anioFiltro));
            params.append('vista', vista);
            params.append('page', String(page));
            params.append('limit', String(limit));
            if (busquedaAlumno) {
                params.append('busqueda', busquedaAlumno);
            }

            const res = await apiFetch(`/pagos/lista-completa?${params.toString()}`);
            const result = await res.json();

            // ✅ Compatibilidad: si la respuesta tiene 'data', usarlo; si no, es un array directo (versión antigua)
            let pagosData = result.data || result;
            // Asegurar que sea un array
            if (!Array.isArray(pagosData)) {
                console.warn('La respuesta no es un array, se esperaba un array de pagos:', pagosData);
                pagosData = [];
            }

            setPagos(pagosData);
            setTotalPages(result.pagination?.pages || 0);
            setTotalItems(result.pagination?.total || 0);
            setTotales(result.totales || { totalPorRecolectar: 0, totalRecolectado: 0 });

            setCargando(false);
        } catch (error) {
            console.error("Error al cargar pagos:", error);
            toast.error('Error al cargar pagos');
            setCargando(false);
        }
    }, [mesFiltro, anioFiltro, busquedaAlumno, vista, page, limit]);

    // Cargar datos al cambiar filtros o página
    useEffect(() => {
        cargarDatos();
    }, [cargarDatos]);

    // Sincronizar recarga desde otros módulos
    useSyncDataReload(cargarDatos);

    // Resetear página cuando cambia la búsqueda o vista
    useEffect(() => {
        setPage(1);
    }, [busquedaAlumno, vista, mesFiltro, anioFiltro]);

    // ============================================================
    // HANDLE CONFIRMAR PAGO
    // ============================================================
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

    // ============================================================
    // RENDER
    // ============================================================
    if (cargando) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-[#26AAA3] mx-auto mb-4"></div>
                    <p className="text-gray-600 font-bold">Cargando pagos...</p>
                </div>
            </div>
        );
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
                        <button
                            onClick={() => setVista('control')}
                            className={`rounded-lg px-6 py-2 text-xs font-black transition-all ${vista === 'control' ? 'bg-[#0047B8] text-white shadow-md shadow-blue-900/15' : 'text-gray-500 hover:bg-cyan-50 hover:text-cyan-700'}`}
                        >
                            PENDIENTES
                        </button>
                        <button
                            onClick={() => setVista('registro')}
                            className={`rounded-lg px-6 py-2 text-xs font-black transition-all ${vista === 'registro' ? 'bg-emerald-500 text-white shadow-md shadow-emerald-900/15' : 'text-gray-500 hover:bg-emerald-50 hover:text-emerald-700'}`}
                        >
                            PAGADOS
                        </button>
                        <button
                            onClick={() => setVista('proximos')}
                            className={`rounded-lg px-6 py-2 text-xs font-black transition-all ${vista === 'proximos' ? 'bg-purple-600 text-white shadow-md shadow-purple-900/15' : 'text-gray-500 hover:bg-purple-50 hover:text-purple-700'}`}
                        >
                            PRÓXIMOS
                        </button>
                    </div>
                </div>
            </header>

            <div className="max-w-6xl mx-auto space-y-6 py-8 px-4 lg:px-0">
                {/* FILTROS */}
                <div className="bg-white border rounded-2xl p-5 shadow-sm grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
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
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Mes</label>
                        <select
                            value={mesFiltro}
                            onChange={(e) => setMesFiltro(Number(e.target.value))}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-xs font-semibold focus:outline-none focus:border-cyan-400 transition-colors"
                        >
                            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                <option key={m} value={m}>
                                    {new Date(2026, m - 1, 1).toLocaleDateString('es-MX', { month: 'long' })}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Año</label>
                        <input
                            type="number"
                            value={anioFiltro}
                            onChange={(e) => setAnioFiltro(Number(e.target.value))}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-xs font-semibold focus:outline-none focus:border-cyan-400 transition-colors"
                            min={2020}
                            max={2030}
                        />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Desde fecha</label>
                        <input
                            type="date"
                            value={fechaInicio}
                            onChange={(e) => setFechaInicio(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-xs font-semibold focus:outline-none focus:border-cyan-400 transition-colors"
                        />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Hasta fecha</label>
                        <input
                            type="date"
                            value={fechaFin}
                            onChange={(e) => setFechaFin(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-xs font-semibold focus:outline-none focus:border-cyan-400 transition-colors"
                        />
                    </div>
                </div>

                {/* RESUMEN */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-cyan-50 border border-cyan-100 rounded-2xl p-4 shadow-sm">
                        <p className="text-[10px] font-bold text-cyan-600 uppercase tracking-wider">Por recolectar</p>
                        <p className="text-2xl font-black text-cyan-900 mt-1">
                            ${totales.totalPorRecolectar.toLocaleString('es-MX')}
                        </p>
                    </div>
                    <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 shadow-sm">
                        <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Recolectado</p>
                        <p className="text-2xl font-black text-emerald-900 mt-1">
                            ${totales.totalRecolectado.toLocaleString('es-MX')}
                        </p>
                    </div>
                    <div className="bg-purple-50 border border-purple-100 rounded-2xl p-4 shadow-sm col-span-2">
                        <p className="text-[10px] font-bold text-purple-600 uppercase tracking-wider">Resumen</p>
                        <p className="text-sm font-medium text-gray-700 mt-1">
                            {totalItems} registros • Página {page} de {totalPages || 1}
                        </p>
                    </div>
                </div>

                {/* LISTA DE PAGOS */}
                <div className="flex flex-col gap-4">
                    {pagos.length > 0 ? (
                        pagos.map((p) => (
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
                                onEditarAbono={handleEditarAbono}
                            />
                        ))
                    ) : (
                        <div className="py-20 text-center bg-white rounded-2xl border-2 border-dashed border-gray-200">
                            <p className="text-gray-400 font-medium">No se encontraron registros con los filtros aplicados.</p>
                        </div>
                    )}
                </div>

                {/* PAGINACIÓN */}
                {totalPages > 1 && (
                    <div className="flex justify-center items-center gap-4 mt-4">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page <= 1}
                            className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Anterior
                        </button>
                        <span className="text-sm text-gray-600">
                            Página {page} de {totalPages}
                        </span>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page >= totalPages}
                            className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Siguiente
                        </button>
                    </div>
                )}

                {/* MODALES */}
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