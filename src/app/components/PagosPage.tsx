import React, { useEffect, useState } from 'react';
import { PaymentRow } from '../components/PaymentRow';
import { RegisterPaymentModal } from '../components/RegisterPaymentModal';
import { getPagosConEstatus, registrarAbono } from '../../services/api';
import { toast } from "sonner";

export function PagosPage() {
    // 1. Estados principales
    const [pagos, setPagos] = useState<any[]>([]);
    const [cargando, setCargando] = useState(true);
    const [vista, setVista] = useState<'control' | 'registro'>('control');

    // Estados para el Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState<any>(null);

    // 2. Carga de datos desde la API
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

    // 3. Logica de confirmacion (Abono o Pago Completo)
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
            cargarDatos(); // Actualiza las listas inmediatamente
        } catch (error: any) {
            toast.error("Error al registrar: " + error.message);
        }
    };

    // 4. Filtrado de listas segun la pestana
    const pagosFiltrados = pagos.filter(p => {
        if (vista === 'control') return p.status !== "Pagado";
        return p.status === "Pagado";
    });

    if (cargando) return <div className="p-10">Cargando informacion...</div>;

    return (
        <div className="p-8 max-w-6xl mx-auto space-y-6">
            {/* Cabecera y Selector de Vista */}
            <div className="flex justify-between items-center border-b pb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">
                        {vista === 'control' ? "Control de Pagos" : "Registro de Completados"}
                    </h1>
                    <p className="text-gray-500 text-sm">Gestion de mensualidades escolares</p>
                </div>

                {/* Switch de Navegacion */}
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
                        />
                    ))
                ) : (
                    <div className="py-20 text-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                        <p className="text-gray-400 font-medium">No hay registros en esta seccion.</p>
                    </div>
                )}
            </div>

            {/* Modal de Registro de Abonos */}
            {isModalOpen && selectedPayment && (
                <RegisterPaymentModal
                    payment={selectedPayment}
                    onClose={() => setIsModalOpen(false)}
                    onConfirm={handleConfirmarPago}
                />
            )}
        </div>
    );
}