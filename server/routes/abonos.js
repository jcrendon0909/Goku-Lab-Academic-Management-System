import express from "express";
import Abono from "../models/Abono.js";
import Pago from "../models/Pago.js";
import Alumno from "../models/Alumno.js";
import { generarId } from "../utils/generarId.js";
import mongoose from "mongoose";

const router = express.Router();

// ============================================================
// FUNCIÓN AUXILIAR: recalcular saldo de un pago
// ============================================================
async function recalcularSaldoPago(pagoId) {
    const abonos = await Abono.find({ pagoId });
    const totalAbonado = abonos.reduce((sum, a) => sum + a.montoAbono, 0);
    const pago = await Pago.findOne({ pagoId });
    if (!pago) return null;

    const montoConDescuento = pago.montoPago * (1 - (pago.descuentoAplicado || 0) / 100);
    const nuevoSaldo = Math.max(0, montoConDescuento - totalAbonado);

    let nuevoEstatus = "Pendiente";
    if (nuevoSaldo === 0) nuevoEstatus = "Pagado";
    else if (totalAbonado > 0) nuevoEstatus = "Parcial";

    // Si el pago tiene saldoAFavor (excedente), se acumula en el alumno
    // Pero esto se maneja en el POST, no aquí.

    pago.estatus = nuevoEstatus;
    pago.fechaPago = nuevoEstatus === "Pagado" ? new Date() : pago.fechaPago;
    await pago.save();

    return { totalAbonado, nuevoSaldo, nuevoEstatus };
}

// ============================================================
// POST / – REGISTRAR UN ABONO (CON DESCUENTOS Y SALDOS)
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
            aplicaSaldoAFavor = false,
        } = req.body;

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

        // 2. Obtener abonos existentes
        const abonosExistentes = await Abono.find({ pagoId });
        const totalAbonado = abonosExistentes.reduce((sum, a) => sum + a.montoAbono, 0);

        // 3. Calcular el monto requerido del pago (con descuento)
        const montoConDescuento = pago.montoPago * (1 - (pago.descuentoAplicado || 0) / 100);
        const saldoRestante = Math.max(0, montoConDescuento - totalAbonado);

        // 4. Si es un abono con descuento, se aplica directamente al pago (sin sumar al total abonado)
        let montoAbonoFinal = Number(montoAbono);
        let esAbonoDescuento = esDescuento;

        // Si es descuento, lo registramos pero no suma al total abonado (solo reduce el monto requerido)
        // Pero para simplificar, manejamos el descuento como un abono con monto positivo (similar a un pago)
        // La diferencia es que el pago se marcará como Pagado si el descuento cubre el saldo.

        // 5. Crear el abono
        const nuevoAbono = new Abono({
            abonoId: await generarId('abono'),
            pagoId: pago.pagoId,
            idAlumno,
            grupoId,
            nombreAlumno,
            montoAbono: montoAbonoFinal,
            metodoAbono: metodoAbono || "Efectivo",
            fechaAbono: fechaAbono ? new Date(fechaAbono) : new Date(),
            numeroDeabono: String(abonosExistentes.length + 1),
            esDescuento: esAbonoDescuento,
            descuentoPorcentaje: esAbonoDescuento ? descuentoPorcentaje : 0,
            mesesCubiertos,
            aplicaSaldoAFavor,
        });

        await nuevoAbono.save();

        // 6. Recalcular saldo del pago (incluyendo descuentos)
        const totalAbonadoActualizado = (await Abono.find({ pagoId })).reduce((sum, a) => sum + a.montoAbono, 0);
        const saldoRestanteNuevo = Math.max(0, montoConDescuento - totalAbonadoActualizado);

        let nuevoEstatus = "Pendiente";
        if (saldoRestanteNuevo === 0) nuevoEstatus = "Pagado";
        else if (totalAbonadoActualizado > 0) nuevoEstatus = "Parcial";

        // 7. Si el pago queda Pagado, actualizar fechaPago
        if (nuevoEstatus === "Pagado") {
            pago.fechaPago = new Date();
        }

        pago.estatus = nuevoEstatus;
        await pago.save();

        // 8. Manejar saldo a favor (excedente)
        let saldoAFavor = 0;
        if (aplicaSaldoAFavor && saldoRestanteNuevo === 0 && totalAbonadoActualizado > pago.montoPago) {
            saldoAFavor = totalAbonadoActualizado - pago.montoPago;
            // Actualizar el saldo a favor del alumno
            const alumno = await Alumno.findOne({ idAlumno });
            if (alumno) {
                alumno.saldoAFavor = (alumno.saldoAFavor || 0) + saldoAFavor;
                await alumno.save();
            }
        }

        // 9. Respuesta exitosa
        res.status(201).json({
            message: "Abono registrado correctamente",
            abono: nuevoAbono,
            saldoRestante: saldoRestanteNuevo,
            estatusPago: nuevoEstatus,
            saldoAFavor: saldoAFavor,
        });

    } catch (error) {
        console.error("❌ Error al registrar abono:", error);
        res.status(500).json({ error: "Error interno al procesar el abono" });
    }
});

// ============================================================
// PUT /:abonoId – EDITAR UN ABONO (CON RECÁLCULO)
// ============================================================
router.put("/:abonoId", async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { abonoId } = req.params;
        const { montoAbono, fechaAbono, metodoAbono, notas } = req.body;

        // Buscar el abono
        const abono = await Abono.findOne({ abonoId });
        if (!abono) {
            await session.abortTransaction();
            return res.status(404).json({ error: "Abono no encontrado" });
        }

        // Guardar el pagoId para recalcular después
        const pagoId = abono.pagoId;

        // Actualizar el abono
        if (montoAbono !== undefined) abono.montoAbono = Number(montoAbono);
        if (fechaAbono) abono.fechaAbono = new Date(fechaAbono);
        if (metodoAbono) abono.metodoAbono = metodoAbono;
        if (notas !== undefined) abono.notas = notas;
        await abono.save({ session });

        // Recalcular el saldo del pago
        const pago = await Pago.findOne({ pagoId }).session(session);
        if (!pago) {
            await session.abortTransaction();
            return res.status(404).json({ error: "Pago asociado no encontrado" });
        }

        // Recalcular total abonado (todos los abonos del pago)
        const abonos = await Abono.find({ pagoId }).session(session);
        const totalAbonado = abonos.reduce((sum, a) => sum + a.montoAbono, 0);

        const montoConDescuento = pago.montoPago * (1 - (pago.descuentoAplicado || 0) / 100);
        const saldoRestante = Math.max(0, montoConDescuento - totalAbonado);

        let nuevoEstatus = "Pendiente";
        if (saldoRestante === 0) nuevoEstatus = "Pagado";
        else if (totalAbonado > 0) nuevoEstatus = "Parcial";

        pago.estatus = nuevoEstatus;
        if (nuevoEstatus === "Pagado") {
            pago.fechaPago = new Date();
        }
        await pago.save({ session });

        // Recalcular saldo a favor del alumno (si aplica)
        // Si el pago está pagado y el total abonado excede el monto original, el excedente se suma al saldoAFavor
        let saldoAFavor = 0;
        if (nuevoEstatus === "Pagado" && totalAbonado > pago.montoPago) {
            saldoAFavor = totalAbonado - pago.montoPago;
            const alumno = await Alumno.findOne({ idAlumno: pago.idAlumno }).session(session);
            if (alumno) {
                alumno.saldoAFavor = (alumno.saldoAFavor || 0) + saldoAFavor;
                await alumno.save({ session });
            }
        }

        await session.commitTransaction();

        res.json({
            ok: true,
            mensaje: "Abono actualizado correctamente",
            abono,
            saldoRestante,
            estatusPago: nuevoEstatus,
            saldoAFavor,
        });

    } catch (error) {
        await session.abortTransaction();
        console.error("❌ Error al editar abono:", error);
        res.status(500).json({ error: "Error interno al editar el abono" });
    } finally {
        session.endSession();
    }
});

// ============================================================
// DELETE /:abonoId – ELIMINAR UN ABONO (CON RECÁLCULO)
// ============================================================
router.delete("/:abonoId", async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { abonoId } = req.params;

        const abono = await Abono.findOne({ abonoId });
        if (!abono) {
            await session.abortTransaction();
            return res.status(404).json({ error: "Abono no encontrado" });
        }

        const pagoId = abono.pagoId;
        await Abono.deleteOne({ abonoId }).session(session);

        // Recalcular saldo del pago
        const pago = await Pago.findOne({ pagoId }).session(session);
        if (pago) {
            const abonosRestantes = await Abono.find({ pagoId }).session(session);
            const totalAbonado = abonosRestantes.reduce((sum, a) => sum + a.montoAbono, 0);
            const montoConDescuento = pago.montoPago * (1 - (pago.descuentoAplicado || 0) / 100);
            const saldoRestante = Math.max(0, montoConDescuento - totalAbonado);

            let nuevoEstatus = "Pendiente";
            if (saldoRestante === 0) nuevoEstatus = "Pagado";
            else if (totalAbonado > 0) nuevoEstatus = "Parcial";

            pago.estatus = nuevoEstatus;
            await pago.save({ session });
        }

        await session.commitTransaction();
        res.json({ ok: true, mensaje: "Abono eliminado correctamente" });

    } catch (error) {
        await session.abortTransaction();
        console.error("❌ Error al eliminar abono:", error);
        res.status(500).json({ error: "Error interno al eliminar el abono" });
    } finally {
        session.endSession();
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
        res.status(500).json({ error: "Error al obtener abonos" });
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
        res.status(500).json({ error: "Error al obtener abonos" });
    }
});

export default router;