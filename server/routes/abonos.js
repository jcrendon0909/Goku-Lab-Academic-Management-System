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
            nuevoMontoMensual
        } = req.body;

        console.log("📥 [ABONO] Recibido:", { pagoId, montoAbono, idAlumno, grupoId, mesesCubiertos, esDescuento, descuentoPorcentaje });

        // Validar campos obligatorios
        if (!pagoId || !montoAbono || !idAlumno || !grupoId) {
            return res.status(400).json({ error: "Faltan datos obligatorios" });
        }

        // 1. Buscar el pago base (el que se está abonando, debe tener el mes en el ID)
        let pagoBase = await Pago.findOne({ pagoId });
        if (!pagoBase) {
            // Intentar buscar el pago sin el mes (formato antiguo) para compatibilidad
            const pagoIdSinMes = crearPagoId(idAlumno, grupoId);
            pagoBase = await Pago.findOne({ pagoId: pagoIdSinMes });
            if (!pagoBase) {
                console.error(`❌ Pago base no encontrado: ${pagoId}`);
                return res.status(404).json({ error: "Pago base no encontrado" });
            }
            console.warn(`⚠️ Se encontró pago sin mes, usando ID: ${pagoIdSinMes}`);
            // Actualizar el pago para que tenga el mes en el ID (si es posible)
            // Pero mejor, forzamos que el abono se registre con el pago existente.
        }

        console.log(`✅ Pago base encontrado: ${pagoBase.pagoId} - fecha: ${pagoBase.fechaInicioPago}`);

        // 2. Determinar el mes de inicio (del pago base)
        const fechaInicio = new Date(pagoBase.fechaInicioPago);
        const diaPago = pagoBase.diaPago || 1;
        console.log(`📅 Mes de inicio: ${fechaInicio.toISOString()}, día de pago: ${diaPago}`);

        // 3. Calcular el monto con descuento por mes
        const montoTotal = Number(montoAbono);
        const montoPorMes = montoTotal / mesesCubiertos;
        const montoConDescuento = esDescuento
            ? montoPorMes * (1 - descuentoPorcentaje / 100)
            : montoPorMes;

        console.log(`💰 Monto total: ${montoTotal}, por mes: ${montoPorMes}, con descuento: ${montoConDescuento}`);

        // 4. Crear/actualizar pagos y abonos para cada mes cubierto
        const abonosCreados = [];
        for (let i = 0; i < mesesCubiertos; i++) {
            const mes = new Date(fechaInicio);
            mes.setMonth(mes.getMonth() + i);
            // Ajustar al día de pago
            const ultimoDiaMes = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate();
            const diaReal = Math.min(diaPago, ultimoDiaMes);
            mes.setDate(diaReal);

            const mesStr = `${mes.getFullYear()}-${String(mes.getMonth() + 1).padStart(2, "0")}`;
            // ✅ Usar crearPagoId con mes incluido
            const nuevoPagoId = crearPagoId(idAlumno, grupoId, mesStr);
            console.log(`🔍 Procesando mes ${mesStr}: nuevoPagoId = ${nuevoPagoId}`);

            // Buscar o crear pago para este mes
            let pagoMes = await Pago.findOne({ pagoId: nuevoPagoId });
            if (!pagoMes) {
                // Si no existe, crearlo con el monto base (sin descuento aún)
                console.log(`⚠️ Pago no encontrado, creando: ${nuevoPagoId}`);
                pagoMes = new Pago({
                    pagoId: nuevoPagoId,
                    idAlumno,
                    grupoId,
                    nombreAlumno: nombreAlumno || pagoBase.nombreAlumno,
                    nombreCurso: pagoBase.nombreCurso,
                    diaPago: diaPago,
                    montoPago: montoConDescuento, // Lo ajustaremos si ya existía
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
                // Si el pago ya existe, solo actualizamos el monto y descuento si no tiene descuento previo
                if (!pagoMes.descuentoAplicado || pagoMes.descuentoAplicado === 0) {
                    pagoMes.montoPago = montoConDescuento;
                    pagoMes.descuentoAplicado = esDescuento ? descuentoPorcentaje : 0;
                    await pagoMes.save();
                    console.log(`✅ Pago actualizado: ${pagoMes.pagoId} -> $${montoConDescuento}`);
                } else {
                    console.log(`⚠️ Pago ya tiene descuento, no se modifica.`);
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
            console.log(`✅ Abono creado: ${nuevoAbono.abonoId} - $${montoConDescuento}`);

            // Marcar el pago como "Pagado" si el abono cubre el monto requerido
            if (montoConDescuento >= pagoMes.montoPago) {
                pagoMes.estatus = "Pagado";
                pagoMes.fechaPago = fechaAbono ? new Date(fechaAbono) : new Date();
                await pagoMes.save();
                console.log(`✅ Pago ${pagoMes.pagoId} marcado como Pagado`);
            } else {
                console.log(`ℹ️ Pago ${pagoMes.pagoId} queda Parcial (${montoConDescuento} < ${pagoMes.montoPago})`);
                pagoMes.estatus = "Parcial";
                await pagoMes.save();
            }

            abonosCreados.push(nuevoAbono);
        }

        // 5. Opcional: Cambiar tarifa para meses futuros
        if (nuevoMontoMensual && nuevoMontoMensual > 0) {
            // Buscar el primer mes futuro no cubierto
            const mesSiguiente = new Date(fechaInicio);
            mesSiguiente.setMonth(mesSiguiente.getMonth() + mesesCubiertos);
            const mesStrSiguiente = `${mesSiguiente.getFullYear()}-${String(mesSiguiente.getMonth() + 1).padStart(2, "0")}`;
            const pagoFuturoId = crearPagoId(idAlumno, grupoId, mesStrSiguiente);
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