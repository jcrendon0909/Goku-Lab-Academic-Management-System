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


    const handleChangeDate = async (pago: any) => {
        const nuevoDia = window.prompt(`Nuevo dia de pago para ${pago.nombreAlumno} (1-31):`, "1");

        if (nuevoDia && !isNaN(Number(nuevoDia))) {
            const diaNum = Number(nuevoDia);
            if (diaNum < 1 || diaNum > 31) return toast.error("Dia invalido");

            try {
                await actualizarDiaPago(pago.id, diaNum);
                toast.success("Dia de pago actualizado");
                cargarDatos(); // Recargamos para ver los cambios
            } catch (error) {
                toast.error("Error al cambiar la fecha");
            }
        }
    };

    // confirmacion de pago
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

    // Filtrado de lista
    const pagosFiltrados = pagos.filter(p => {
        if (vista === 'control') return p.activo !== false && p.status !== "Pagado";
        return p.status === "Pagado" || (p.activo === false && Number(p.montoPagado || 0) > 0);
    });

    if (cargando) return <div className="p-10 text-center">Cargando informacion...</div>;

    // TOTALES DEL MES
    const hoy = new Date();
    const mesActual = hoy.getMonth();
    const anioActual = hoy.getFullYear();

    // 1. Dinero ha recolectar este mes
    const totalPorRecolectar = pagos
        .filter(p => {
            if (p.activo === false) return false;
            if (p.status === "Pagado") return false;
            const fecha = new Date(p.fechaLimite);
            return fecha.getMonth() === mesActual && fecha.getFullYear() === anioActual;
        })
        .reduce((sum, p) => sum + p.montoTotal, 0);

    // Total recolectado este mes
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
            <div className="max-w-6xl mx-auto space-y-6">

                {/* Cabecera y Switch de Navegación Unificados */}
                <div className="flex justify-between items-center border-b pb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">
                            {vista === 'control' ? "Control de Pagos" : "Registro de Completados"}
                        </h1>
                        <p className="text-gray-500 text-sm">Gestión académica de Goku Lab</p>
                    </div>

                    {/* Switch de Navegación */}
                    <div className="flex bg-gray-100 p-1 rounded-xl border">
                        <button
                            onClick={() => setVista('control')}
                            className={`px-6 py-2 rounded-lg text-xs font-bold transition-all ${vista === 'control' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}
                        >
                            PENDIENTES
                        </button>
                        <button
                            onClick={() => setVista('registro')}
                            className={`px-6 py-2 rounded-lg text-xs font-bold transition-all ${vista === 'registro' ? 'bg-white shadow text-green-600' : 'text-gray-500'}`}
                        >
                            PAGADOS
                        </button>
                    </div>
                </div>

                {/* TARJETAS DE TOTALES DEL MES (Ahora alineadas perfectamente) */}
                <div>
                    {vista === 'control' ? (
                        // Vista Pendientes: Muestra lo estimado a recolectar
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
                        // Vista Pagados: Muestra lo ya recolectado real
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

                {/* Contenedor de la Lista */}
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
                        <div className="py-20 text-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                            <p className="text-gray-400 font-medium">No hay registros en esta sección.</p>
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
