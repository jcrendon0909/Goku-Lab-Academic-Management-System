import express from "express";
import Abono from "../models/Abono.js";
import Pago from "../models/Pago.js";
import Alumno from "../models/Alumno.js";
import { generarId } from "../utils/generarId.js";
import { crearPagoId } from "../utils/pagos.js";
import mongoose from "mongoose";

const router = express.Router();

// ============================================================
// FUNCIÓN AUXILIAR: recalcular saldo de un pago (sin usar)
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

    pago.estatus = nuevoEstatus;
    pago.fechaPago = nuevoEstatus === "Pagado" ? new Date() : pago.fechaPago;
    await pago.save();

    return { totalAbonado, nuevoSaldo, nuevoEstatus };
}

// ============================================================
// POST / – REGISTRAR ABONO CON DISTRIBUCIÓN AUTOMÁTICA
// ============================================================
router.post("/", async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

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
        if (!pagoId || !montoAbono || !idAlumno || !grupoId) {
            return res.status(400).json({ error: "Faltan datos obligatorios" });
        }

        // 1. Obtener el pago base (el que se está abonando, ej. enero)
        const pagoBase = await Pago.findOne({ pagoId }).session(session);
        if (!pagoBase) {
            return res.status(404).json({ error: "Pago base no encontrado" });
        }

        // 2. Determinar los meses a cubrir (a partir del mes del pago base)
        const fechaInicio = new Date(pagoBase.fechaInicioPago);
        const meses = [];
        for (let i = 0; i < mesesCubiertos; i++) {
            const mes = new Date(fechaInicio);
            mes.setMonth(mes.getMonth() + i);
            meses.push(mes);
        }

        // 3. Calcular monto por mes con descuento
        const montoTotal = Number(montoAbono);
        const montoPorMes = montoTotal / mesesCubiertos;
        const montoConDescuento = esDescuento
            ? montoPorMes * (1 - descuentoPorcentaje / 100)
            : montoPorMes;

        // 4. Crear/actualizar pagos y abonos para cada mes
        const abonosCreados = [];
        for (let i = 0; i < meses.length; i++) {
            const mes = meses[i];
            const mesStr = `${mes.getFullYear()}-${String(mes.getMonth() + 1).padStart(2, "0")}`;
            const nuevoPagoId = crearPagoId(idAlumno, grupoId, mesStr);

            // Buscar o crear pago para este mes
            let pagoMes = await Pago.findOne({ pagoId: nuevoPagoId }).session(session);
            if (!pagoMes) {
                // Si no existe, crearlo con el monto con descuento
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
                await pagoMes.save({ session });
            } else {
                // Si ya existe, actualizar el monto y el descuento (si no tiene descuento previo)
                if (!pagoMes.descuentoAplicado || pagoMes.descuentoAplicado === 0) {
                    pagoMes.montoPago = montoConDescuento;
                    pagoMes.descuentoAplicado = esDescuento ? descuentoPorcentaje : 0;
                    await pagoMes.save({ session });
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
                esDescuento: esDescuento,
                descuentoPorcentaje: esDescuento ? descuentoPorcentaje : 0,
                mesesCubiertos: 1,
                notas: `Abono distribuido para ${mesStr}`,
            });
            await nuevoAbono.save({ session });

            // Marcar el pago como "Pagado" si el abono cubre el monto requerido
            if (montoConDescuento >= pagoMes.montoPago) {
                pagoMes.estatus = "Pagado";
                pagoMes.fechaPago = fechaAbono ? new Date(fechaAbono) : new Date();
                await pagoMes.save({ session });
            }

            abonosCreados.push(nuevoAbono);
        }

        await session.commitTransaction();

        res.status(201).json({
            message: `Abono distribuido en ${mesesCubiertos} meses`,
            abonos: abonosCreados,
        });

    } catch (error) {
        await session.abortTransaction();
        console.error("❌ Error al registrar abono distribuido:", error);
        res.status(500).json({ error: error.message });
    } finally {
        session.endSession();
    }
});

// ============================================================
// PUT /:abonoId – EDITAR ABONO (con recálculo)
// ============================================================
router.put("/:abonoId", async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { abonoId } = req.params;
        const { montoAbono, fechaAbono, metodoAbono, notas } = req.body;

        const abono = await Abono.findOne({ abonoId });
        if (!abono) {
            await session.abortTransaction();
            return res.status(404).json({ error: "Abono no encontrado" });
        }

        const pagoId = abono.pagoId;

        if (montoAbono !== undefined) abono.montoAbono = Number(montoAbono);
        if (fechaAbono) abono.fechaAbono = new Date(fechaAbono);
        if (metodoAbono) abono.metodoAbono = metodoAbono;
        if (notas !== undefined) abono.notas = notas;
        await abono.save({ session });

        // Recalcular el saldo del pago
        const pago = await Pago.findOne({ pagoId }).session(session);
        if (pago) {
            const abonos = await Abono.find({ pagoId }).session(session);
            const totalAbonado = abonos.reduce((sum, a) => sum + a.montoAbono, 0);
            const montoConDescuento = pago.montoPago * (1 - (pago.descuentoAplicado || 0) / 100);
            const saldoRestante = Math.max(0, montoConDescuento - totalAbonado);
            let nuevoEstatus = "Pendiente";
            if (saldoRestante === 0) nuevoEstatus = "Pagado";
            else if (totalAbonado > 0) nuevoEstatus = "Parcial";
            pago.estatus = nuevoEstatus;
            if (nuevoEstatus === "Pagado") pago.fechaPago = new Date();
            await pago.save({ session });
        }

        await session.commitTransaction();
        res.json({ ok: true, mensaje: "Abono actualizado" });

    } catch (error) {
        await session.abortTransaction();
        console.error("❌ Error al editar abono:", error);
        res.status(500).json({ error: error.message });
    } finally {
        session.endSession();
    }
});

// ============================================================
// DELETE /:abonoId – ELIMINAR ABONO
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
        res.json({ ok: true, mensaje: "Abono eliminado" });

    } catch (error) {
        await session.abortTransaction();
        console.error("❌ Error al eliminar abono:", error);
        res.status(500).json({ error: error.message });
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