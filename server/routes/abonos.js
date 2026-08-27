import express from "express";
import Abono from "../models/Abono.js";
import Pago from "../models/Pago.js";
import Alumno from "../models/Alumno.js";
import { generarId } from "../utils/generarId.js";
import { crearPagoId } from "../utils/pagos.js";

const router = express.Router();

// ============================================================
// POST / – REGISTRAR ABONO CON DISTRIBUCIÓN
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
            nuevoMontoMensual
        } = req.body;

        console.log("📥 [ABONO] Recibido:", { pagoId, montoAbono, idAlumno, grupoId, mesesCubiertos, esDescuento, descuentoPorcentaje });

        // Validar campos
        if (!pagoId || !montoAbono || !idAlumno || !grupoId) {
            return res.status(400).json({ error: "Faltan datos obligatorios" });
        }

        // Buscar el pago base (el que se está abonando)
        let pagoBase = await Pago.findOne({ pagoId });
        if (!pagoBase) {
            // Fallback: buscar sin mes (formato antiguo)
            const pagoIdSinMes = crearPagoId(idAlumno, grupoId);
            pagoBase = await Pago.findOne({ pagoId: pagoIdSinMes });
            if (!pagoBase) {
                console.error(`❌ Pago base no encontrado: ${pagoId}`);
                return res.status(404).json({ error: "Pago base no encontrado" });
            }
            console.warn(`⚠️ Se encontró pago sin mes, usando ID: ${pagoIdSinMes}`);
        }

        console.log(`✅ Pago base: ${pagoBase.pagoId} - fecha: ${pagoBase.fechaInicioPago}`);

        const fechaInicio = new Date(pagoBase.fechaInicioPago);
        const diaPago = pagoBase.diaPago || 1;

        // ✅ CORRECCIÓN: Si es descuento, el monto total YA incluye el descuento
        // Por lo tanto, NO se debe aplicar descuento adicional.
        const montoTotal = Number(montoAbono);
        const montoPorMes = montoTotal / mesesCubiertos;
        // Si es descuento, usamos montoPorMes directamente (ya incluye descuento)
        // Si no es descuento, también usamos montoPorMes (distribución equitativa)
        const montoConDescuento = montoPorMes; // ← ¡Ya no aplicamos descuento extra!

        console.log(`💰 Monto total: ${montoTotal}, por mes: ${montoPorMes}`);

        const abonosCreados = [];

        for (let i = 0; i < mesesCubiertos; i++) {
            const mes = new Date(fechaInicio);
            mes.setMonth(mes.getMonth() + i);
            const ultimoDiaMes = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate();
            const diaReal = Math.min(diaPago, ultimoDiaMes);
            mes.setDate(diaReal);

            const mesStr = `${mes.getFullYear()}-${String(mes.getMonth() + 1).padStart(2, "0")}`;
            const nuevoPagoId = crearPagoId(idAlumno, grupoId, mesStr);
            console.log(`🔍 Procesando mes ${mesStr}: nuevoPagoId = ${nuevoPagoId}`);

            let pagoMes = await Pago.findOne({ pagoId: nuevoPagoId });
            if (!pagoMes) {
                console.log(`⚠️ Pago no encontrado, creando: ${nuevoPagoId}`);
                pagoMes = new Pago({
                    pagoId: nuevoPagoId,
                    idAlumno,
                    grupoId,
                    nombreAlumno: nombreAlumno || pagoBase.nombreAlumno,
                    nombreCurso: pagoBase.nombreCurso,
                    diaPago: diaPago,
                    montoPago: montoConDescuento,
                    fechaInicioPago: mes,
                    activo: true,
                    fechaBaja: null,
                    periodo: "Mes",
                    estatus: "Pendiente",
                    descuentoAplicado: esDescuento ? descuentoPorcentaje : 0,
                });
                await pagoMes.save();
                console.log(`✅ Pago creado: ${pagoMes.pagoId}`);
            } else {
                console.log(`ℹ️ Pago existente: ${pagoMes.pagoId}`);
                // Si el pago ya existe, actualizar solo si no tiene descuento previo
                if (!pagoMes.descuentoAplicado || pagoMes.descuentoAplicado === 0) {
                    pagoMes.montoPago = montoConDescuento;
                    pagoMes.descuentoAplicado = esDescuento ? descuentoPorcentaje : 0;
                    await pagoMes.save();
                    console.log(`✅ Pago actualizado: ${pagoMes.pagoId} -> $${montoConDescuento}`);
                } else {
                    console.log(`⚠️ Pago ya tiene descuento, no se modifica.`);
                }
            }

            // Crear abono para este mes
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
            console.log(`✅ Abono creado: ${nuevoAbono.abonoId} - $${montoConDescuento}`);

            // Marcar como Pagado si cubre el monto
            if (montoConDescuento >= pagoMes.montoPago) {
                pagoMes.estatus = "Pagado";
                pagoMes.fechaPago = fechaAbono ? new Date(fechaAbono) : new Date();
                await pagoMes.save();
                console.log(`✅ Pago ${pagoMes.pagoId} marcado como Pagado`);
            } else {
                pagoMes.estatus = "Parcial";
                await pagoMes.save();
                console.log(`ℹ️ Pago ${pagoMes.pagoId} queda Parcial`);
            }

            abonosCreados.push(nuevoAbono);
        }

        // Cambiar tarifa futura (opcional)
        if (nuevoMontoMensual && nuevoMontoMensual > 0) {
            const mesSiguiente = new Date(fechaInicio);
            mesSiguiente.setMonth(mesSiguiente.getMonth() + mesesCubiertos);
            const mesStrSig = `${mesSiguiente.getFullYear()}-${String(mesSiguiente.getMonth() + 1).padStart(2, "0")}`;
            const pagoFuturoId = crearPagoId(idAlumno, grupoId, mesStrSig);
            const pagoFuturo = await Pago.findOne({ pagoId: pagoFuturoId });
            if (pagoFuturo) {
                pagoFuturo.montoPago = nuevoMontoMensual;
                pagoFuturo.descuentoAplicado = 0;
                await pagoFuturo.save();
                console.log(`✅ Tarifa futura actualizada: ${pagoFuturoId} -> $${nuevoMontoMensual}`);
            }
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

// GET /pago/:pagoId
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

// GET /alumno/:idAlumno
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