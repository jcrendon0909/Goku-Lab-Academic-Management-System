import express from "express";
import Abono from "../models/Abono.js";
import Pago from "../models/Pago.js";
import Alumno from "../models/Alumno.js";
import { generarId } from "../utils/generarId.js";
import { crearPagoId } from "../utils/pagos.js";

const router = express.Router();

// ============================================================
// POST / – REGISTRAR ABONO CON DESCUENTO Y MESES CUBIERTOS
// ============================================================
router.post("/", async (req, res) => {
    try {
        const {
            pagoId,
            montoAbono,
            nombreAlumno,
            metodoAbono,
            fechaAbono,
            idAlumno,
            grupoId,
            esDescuento = false,
            descuentoPorcentaje = 0,
            mesesCubiertos = 1,
        } = req.body;

        // Validar campos obligatorios
        if (!pagoId || !montoAbono || !idAlumno || !grupoId) {
            return res.status(400).json({ error: "Faltan datos obligatorios" });
        }

        // 1. Obtener el pago base (el que se está abonando, ej. enero)
        const pagoBase = await Pago.findOne({ pagoId });
        if (!pagoBase) {
            return res.status(404).json({ error: "Pago base no encontrado" });
        }

        // 2. Determinar el mes de inicio (del pago base)
        const fechaInicio = new Date(pagoBase.fechaInicioPago);

        // 3. Calcular el monto con descuento por mes
        const montoTotal = Number(montoAbono);
        const montoPorMes = montoTotal / mesesCubiertos;
        const montoConDescuento = esDescuento
            ? montoPorMes * (1 - descuentoPorcentaje / 100)
            : montoPorMes;

        // 4. Crear pagos y abonos para cada mes cubierto
        const abonosCreados = [];
        for (let i = 0; i < mesesCubiertos; i++) {
            const mes = new Date(fechaInicio);
            mes.setMonth(mes.getMonth() + i);
            const mesStr = `${mes.getFullYear()}-${String(mes.getMonth() + 1).padStart(2, "0")}`;
            
            // Crear pagoId con mes (ej. ALU044-GRUXXX-2026-01)
            const nuevoPagoId = crearPagoId(idAlumno, grupoId, mesStr);

            // Buscar o crear pago para este mes
            let pagoMes = await Pago.findOne({ pagoId: nuevoPagoId });
            if (!pagoMes) {
                pagoMes = new Pago({
                    pagoId: nuevoPagoId,
                    idAlumno,
                    grupoId,
                    nombreAlumno: nombreAlumno || pagoBase.nombreAlumno,
                    nombreCurso: pagoBase.nombreCurso,
                    diaPago: pagoBase.diaPago,
                    montoPago: montoConDescuento,
                    fechaInicioPago: mes,
                    activo: true,
                    fechaBaja: null,
                    periodo: "Mes",
                    estatus: "Pendiente",
                    descuentoAplicado: esDescuento ? descuentoPorcentaje : 0,
                });
                await pagoMes.save();
            } else {
                // Si ya existe, actualizar el monto y el descuento si no tiene descuento previo
                if (!pagoMes.descuentoAplicado || pagoMes.descuentoAplicado === 0) {
                    pagoMes.montoPago = montoConDescuento;
                    pagoMes.descuentoAplicado = esDescuento ? descuentoPorcentaje : 0;
                    await pagoMes.save();
                }
            }

            // Crear el abono para este mes
            const nuevoAbono = new Abono({
                abonoId: await generarId("abono"),
                pagoId: nuevoPagoId,
                idAlumno,
                grupoId,
                nombreAlumno: nombreAlumno || pagoBase.nombreAlumno,
                montoAbono: montoConDescuento,
                metodoAbono: metodoAbono || "Efectivo",
                fechaAbono: fechaAbono ? new Date(fechaAbono) : new Date(),
                numeroDeabono: String(i + 1),
                notas: `Abono distribuido para ${mesStr}`,
            });
            await nuevoAbono.save();

            // Marcar el pago como "Pagado" si el abono cubre el monto requerido
            if (montoConDescuento >= pagoMes.montoPago) {
                pagoMes.estatus = "Pagado";
                pagoMes.fechaPago = fechaAbono ? new Date(fechaAbono) : new Date();
                await pagoMes.save();
            }

            abonosCreados.push(nuevoAbono);
        }

        res.status(201).json({
            message: `Abono distribuido en ${mesesCubiertos} meses`,
            abonos: abonosCreados,
        });

    } catch (error) {
        console.error("❌ Error al registrar abono distribuido:", error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================================
// GET /pago/:pagoId – OBTENER ABONOS DE UN PAGO
// ============================================================
router.get("/pago/:pagoId", async (req, res) => {
    try {
        const { pagoId } = req.params;
        const abonos = await Abono.find({ pagoId }).sort({ fechaAbono: -1 });
        res.json(abonos);
    } catch (error) {
        console.error("❌ Error al obtener abonos:", error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================================
// GET /alumno/:idAlumno – OBTENER ABONOS DE UN ALUMNO
// ============================================================
router.get("/alumno/:idAlumno", async (req, res) => {
    try {
        const { idAlumno } = req.params;
        const abonos = await Abono.find({ idAlumno }).sort({ fechaAbono: -1 });
        res.json(abonos);
    } catch (error) {
        console.error("❌ Error al obtener abonos del alumno:", error);
        res.status(500).json({ error: error.message });
    }
});

export default router;