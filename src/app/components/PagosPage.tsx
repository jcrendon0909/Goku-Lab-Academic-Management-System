
import React, { useEffect, useState } from 'react';
import { Navbar } from '../components/Navbar';
import { PaymentRow } from '../components/PaymentRow';
import { RegisterPaymentModal } from '../components/RegisterPaymentModal';
import { getPagosConEstatus, registrarAbono, actualizarDiaPago } from '../../services/api';
import { toast } from "sonner";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const userStorage = localStorage.getItem('user');
const userLogueado = userStorage ? JSON.parse(userStorage) : null;
const esAdmin = userLogueado?.rol === 'admin';

export function PagosPage() {
    const [pagos, setPagos] = useState<any[]>([]);
    const [cargando, setCargando] = useState(true);
    const [vista, setVista] = useState<'control' | 'registro'>('control');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState<any>(null);

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

    const handleImprimirRecibo = (pago: any) => {
        const generarPDF = (quiereFactura: boolean) => {
        const estadoFacturacion = quiereFactura ? "Solicitada" : "No solicitada";

        const ahora = new Date();
        const anioActual = ahora.getFullYear();
        const mesActualNum = String(ahora.getMonth() + 1).padStart(2, '0');
        const anioMesNomenclatura = `${anioActual}-${mesActualNum}`;

        const fechaConsulta = ahora.toLocaleString('es-MX', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });

        // Número de folio
        const numeroTresDigitos = String(Math.floor(Math.random() * 900) + 100).padStart(3, '0');
        const folioDocumento = `AL/CF/${anioMesNomenclatura}-R${numeroTresDigitos}`;

        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        doc.setFillColor(0, 120, 215);
        doc.rect(0, 0, 210, 38, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(22);
        doc.text("GOKU LAB", 15, 16);

        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(9);
        doc.text("Juega, Aprende y Emprende - Algorithmics", 15, 23);
        doc.text("COMPROBANTE DE PAGO DIGITAL", 15, 30);

        // Caja de Folio (Lado derecho del encabezado)
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(135, 8, 60, 22, 2, 2, 'F');
        doc.setDrawColor(200, 200, 200);
        doc.roundedRect(135, 8, 60, 22, 2, 2, 'D');

        doc.setTextColor(100, 100, 100);
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(7);
        doc.text("FOLIO DE RECIBO", 140, 14);
        doc.setTextColor(15, 23, 42);
        doc.setFontSize(11);
        doc.text(folioDocumento, 140, 22);

        // Bloque de Información del Recibo
        doc.setTextColor(50, 50, 50);
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(11);
        doc.text("Detalles de la Operación", 15, 52);

        doc.setDrawColor(226, 232, 240);
        doc.line(15, 55, 195, 55);

        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(10);

        doc.text("Estudiante / Alumno:", 15, 64);
        doc.setFont('Helvetica', 'bold');
        doc.text(pago.nombreAlumno || "N/A", 55, 64);

        doc.setFont('Helvetica', 'normal');
        doc.text("Fecha de Pago Real:", 15, 72);
        doc.setFont('Helvetica', 'bold');
        doc.text(pago.fechaPagoReal || "N/A", 55, 72);

        doc.setFont('Helvetica', 'normal');
        doc.text("Fecha de Consulta:", 15, 80);
        doc.setFont('Helvetica', 'bold');
        doc.text(fechaConsulta, 55, 80);

        doc.setFont('Helvetica', 'normal');
        doc.text("Forma de Pago:", 15, 88);
        doc.setFont('Helvetica', 'bold');
        doc.text(pago.metodoAbono || "Transferencia / Efectivo", 55, 88);

        doc.setFont('Helvetica', 'normal');
        doc.text("Facturación:", 15, 96);
        doc.setFont('Helvetica', 'bold');
        if (quiereFactura) {
            doc.setTextColor(2, 132, 199); 
        } else {
            doc.setTextColor(100, 116, 139); 
        }
        doc.text(estadoFacturacion, 55, 96);

        doc.setTextColor(50, 50, 50);
        autoTable(doc, {
            startY: 106,
            theme: 'striped',
            headStyles: { fillColor: [15, 23, 42], fontStyle: 'bold' },
            head: [['Concepto', 'Estatus', 'Monto']],
            body: [
                ['Pago de colegiatura / Servicios Académicos', 'PAGADO', `$${Number(pago.montoTotal || 0).toLocaleString('es-MX')}`]
            ],
            styles: { fontSize: 10, cellPadding: 5 },
            columnStyles: { 2: { halign: 'right' } }
        });

        const finalY = (doc as any).lastAutoTable.finalY + 15;

        doc.setDrawColor(0, 120, 215);
        doc.setLineWidth(0.5);
        doc.rect(15, finalY, 55, 16, 'D');
        doc.setTextColor(0, 120, 215);
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(9);
        doc.text("RECIBIDO POR SYSTEM", 18, finalY + 7);
        doc.setFontSize(7);
        doc.setFont('Helvetica', 'normal');
        doc.text("Procesado de forma segura", 18, finalY + 12);

        doc.setTextColor(15, 23, 42);
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(11);
        doc.text(`Total Liquidado: $${Number(pago.montoTotal || 0).toLocaleString('es-MX')} MXN`, 125, finalY + 9);

        doc.setTextColor(150, 150, 150);
        doc.setFontSize(8);
        doc.text("Este documento es un comprobante oficial de control interno emitido por Goku Lab.", 15, 280);

        doc.save(`Recibo_${pago.nombreAlumno.replace(/\s+/g, '_')}_${anioMesNomenclatura}.pdf`);
        toast.success("Comprobante generado exitosamente en PDF");
        };
        toast.message('¿Desea Facturar?', {
            description: `Recibo de: ${pago.nombreAlumno}`,
            duration: 8000,
            action: {
                label: 'Sí, Facturar',
                onClick: () => generarPDF(true),
            },
            cancel: {
                label: 'No',
                onClick: () => generarPDF(false),
            },
        });
    };

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

            const fechaLimpiaObj = fechaEvaluarTexto.substring(0, 10);

            if (fechaInicio && fechaLimpiaObj < fechaInicio) return false;

            if (fechaFin && fechaLimpiaObj > fechaFin) return false;

            return true;
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

                {/* LISTA DE RENGLONES CON BOTÓN DE IMPRESIÓN INTEGRADO */}
                <div className="flex flex-col gap-4">
                    {pagosFiltrados.length > 0 ? (
                        pagosFiltrados.map((p) => (
                            <div key={p.id} className="relative group">
                                <PaymentRow
                                    payment={p}
                                    onRegisterPayment={() => {
                                        setSelectedPayment(p);
                                        setIsModalOpen(true);
                                    }}
                                    onChangePaymentDate={() => handleChangeDate(p)}
                                />

                                {/* BOTÓN DE IMPRESIÓN */}
                                {vista === 'registro' && (
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center">
                                        <button
                                            onClick={() => handleImprimirRecibo(p)}
                                            className="bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-black shadow-sm hover:bg-slate-900 transition-colors flex items-center gap-2"
                                        >
                                            🖨️ IMPRIMIR RECIBO
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))
                    ) : (
                        <div className="py-20 text-center bg-white rounded-2xl border-2 border-dashed border-gray-200">
                            <p className="text-gray-400 font-medium">No se encontraron registros con los filtros aplicados.</p>
                        </div>
                    )}
                </div>

                {/* MODAL */}
                {isModalOpen && selectedPayment && (
                    <RegisterPaymentModal payment={selectedPayment} onClose={() => setIsModalOpen(false)} onConfirm={handleConfirmarPago} />
                )}
            </div>
        </div>
    );
}