import express from "express";
import Abono from "../models/Abono.js";
import Pago from "../models/Pago.js";
import { generarId } from "../utils/generarId.js";

const router = express.Router();

// ===== REGISTRAR UN ABONO =====
router.post("/", async (req, res) => {
    try {
        const { pagoId, montoAbono, nombreAlumno, metodoAbono, fechaAbono, idAlumno, grupoId } = req.body;

        // Validar campos obligatorios
        if (!pagoId || !montoAbono || !nombreAlumno || !idAlumno || !grupoId) {
            return res.status(400).json({
                error: "Faltan datos: pagoId, montoAbono, nombreAlumno, idAlumno, grupoId"
            });
        }

        // 1. Buscar el pago
        const pago = await Pago.findOne({ pagoId });
        if (!pago) {
            return res.status(404).json({ error: "Pago no encontrado" });
        }

        // 2. Verificar que el pago no esté ya pagado
        if (pago.estatus === "Pagado") {
            return res.status(400).json({ error: "Este pago ya está pagado" });
        }

        // 3. Calcular abonos existentes
        const abonosExistentes = await Abono.find({ pagoId });
        const totalAbonado = abonosExistentes.reduce((sum, a) => sum + a.montoAbono, 0);
        const nuevoTotal = totalAbonado + Number(montoAbono);

        // 4. Crear el abono
        const nuevoAbono = new Abono({
            abonoId: await generarId('abono'),
            pagoId: pago.pagoId,
            idAlumno: idAlumno,        // ← Del body
            grupoId: grupoId,          // ← Del body
            nombreAlumno: nombreAlumno,
            montoAbono: Number(montoAbono),
            metodoAbono: metodoAbono || "Efectivo",
            fechaAbono: fechaAbono ? new Date(fechaAbono) : new Date(),
            numeroDeabono: String(abonosExistentes.length + 1),
        });

        await nuevoAbono.save();

        // 5. Actualizar el estado del pago
        if (nuevoTotal >= pago.montoPago) {
            pago.estatus = "Pagado";
            pago.fechaPago = new Date();
        } else {
            pago.estatus = "Parcial";
        }
        await pago.save();

        // 6. Respuesta exitosa
        res.status(201).json({
            message: "Abono registrado correctamente",
            abono: nuevoAbono,
            saldoRestante: Math.max(0, pago.montoPago - nuevoTotal),
            estatusPago: pago.estatus,
        });

    } catch (error) {
        console.error("❌ Error al registrar abono:", error);
        res.status(500).json({ error: "Error interno al procesar el abono" });
    }
});

// ===== OBTENER ABONOS DE UN PAGO =====
router.get("/pago/:pagoId", async (req, res) => {
    try {
        const { pagoId } = req.params;
        const abonos = await Abono.find({ pagoId }).sort({ fechaAbono: -1 });
        res.json(abonos);
    } catch (error) {
        console.error("❌ Error al obtener abonos:", error);
        res.status(500).json({ error: "Error al obtener abonos" });
    }
});

// ===== OBTENER ABONOS DE UN ALUMNO =====
router.get("/alumno/:idAlumno", async (req, res) => {
    try {
        const { idAlumno } = req.params;
        const abonos = await Abono.find({ idAlumno }).sort({ fechaAbono: -1 });
        res.json(abonos);
    } catch (error) {
        console.error("❌ Error al obtener abonos del alumno:", error);
        res.status(500).json({ error: "Error al obtener abonos" });
    }
});

export default router;