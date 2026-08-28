import express from "express";
import Abono from "../models/Abono.js";
import Pago from "../models/Pago.js";
import Alumno from "../models/Alumno.js";
import { generarId } from "../utils/generarId.js";
import { crearPagoId } from "../utils/pagos.js";
import cache from "../utils/cache.js"; // ← Importar caché

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
            fechaAbono: fechaAbonoRaw,
            idAlumno,
            grupoId,
            esDescuento = false,
            descuentoPorcentaje = 0,
            mesesCubiertos = 1,
            nuevoMontoMensual
        } = req.body;

        // Validar campos
        if (!pagoId || !montoAbono || !idAlumno || !grupoId) {
            return res.status(400).json({ error: "Faltan datos obligatorios" });
        }

        // Normalizar fechaAbono a hora fija (12:00) para evitar offset de zona horaria
        let fechaAbono = new Date();
        if (fechaAbonoRaw) {
            const [year, month, day] = fechaAbonoRaw.split('-').map(Number);
            fechaAbono = new Date(year, month - 1, day, 12, 0, 0);
        }

        // Buscar el pago base
        let pagoBase = await Pago.findOne({ pagoId });
        if (!pagoBase) {
            const pagoIdSinMes = crearPagoId(idAlumno, grupoId);
            pagoBase = await Pago.findOne({ pagoId: pagoIdSinMes });
            if (!pagoBase) {
                console.error(`❌ Pago base no encontrado: ${pagoId}`);
                return res.status(404).json({ error: "Pago base no encontrado" });
            }
        }

        const fechaInicio = new Date(pagoBase.fechaInicioPago);
        const diaPago = pagoBase.diaPago || 1;

        const montoTotal = Number(montoAbono);
        const montoPorMes = montoTotal / mesesCubiertos;
        const montoConDescuento = montoPorMes;

        const abonosCreados = [];

        for (let i = 0; i < mesesCubiertos; i++) {
            const mes = new Date(fechaInicio);
            mes.setMonth(mes.getMonth() + i);
            const ultimoDiaMes = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate();
            const diaReal = Math.min(diaPago, ultimoDiaMes);
            mes.setDate(diaReal);
            mes.setHours(12, 0, 0, 0);

            const mesStr = `${mes.getFullYear()}-${String(mes.getMonth() + 1).padStart(2, "0")}`;
            const nuevoPagoId = crearPagoId(idAlumno, grupoId, mesStr);

            let pagoMes = await Pago.findOne({ pagoId: nuevoPagoId });
            if (!pagoMes) {
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
            } else {
                if (!pagoMes.descuentoAplicado || pagoMes.descuentoAplicado === 0) {
                    pagoMes.montoPago = montoConDescuento;
                    pagoMes.descuentoAplicado = esDescuento ? descuentoPorcentaje : 0;
                    await pagoMes.save();
                }
            }

            const nuevoAbono = new Abono({
                abonoId: await generarId("abono"),
                pagoId: nuevoPagoId,
                idAlumno,
                grupoId,
                nombreAlumno: nombreAlumno || pagoBase.nombreAlumno,
                montoAbono: montoConDescuento,
                metodoAbono: metodoAbono || "Efectivo",
                fechaAbono: fechaAbono,
                numeroDeabono: String(i + 1),
                notas: `Abono distribuido para ${mesStr}`,
            });
            await nuevoAbono.save();

            if (montoConDescuento >= pagoMes.montoPago) {
                pagoMes.estatus = "Pagado";
                pagoMes.fechaPago = fechaAbono;
                await pagoMes.save();
            } else {
                pagoMes.estatus = "Parcial";
                await pagoMes.save();
            }

            abonosCreados.push(nuevoAbono);
        }

        // Cambiar tarifa futura (opcional)
        if (nuevoMontoMensual && nuevoMontoMensual > 0) {
            const mesSiguiente = new Date(fechaInicio);
            mesSiguiente.setMonth(mesSiguiente.getMonth() + mesesCubiertos);
            mesSiguiente.setHours(12, 0, 0, 0);
            const mesStrSig = `${mesSiguiente.getFullYear()}-${String(mesSiguiente.getMonth() + 1).padStart(2, "0")}`;
            const pagoFuturoId = crearPagoId(idAlumno, grupoId, mesStrSig);
            const pagoFuturo = await Pago.findOne({ pagoId: pagoFuturoId });
            if (pagoFuturo) {
                pagoFuturo.montoPago = nuevoMontoMensual;
                pagoFuturo.descuentoAplicado = 0;
                await pagoFuturo.save();
            }
        }

        // 🔥 INVALIDAR CACHÉ DE PAGOS PARA QUE SE REFRESQUE LA VISTA
        cache.flushAll();
        console.log('🗑️ Caché de pagos invalidada por nuevo abono.');

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