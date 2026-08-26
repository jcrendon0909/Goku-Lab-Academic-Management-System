import express from "express";
import Pago from "../models/Pago.js";
import Inscripcion from "../models/Inscripcion.js";
import Grupo from "../models/Grupo.js";
import { crearPagoId } from "../utils/pagos.js";

const router = express.Router();

// ============================================================
// FUNCIÓN PARA SINCRONIZAR PAGOS (CREA 12 MESES FUTUROS)
// ============================================================
async function sincronizarPagosDesdeInscripciones() {
    const inscripciones = await Inscripcion.find({
        estatus: { $ne: "Baja" },
        montoMensualidad: { $gt: 0 },
    }).lean();

    if (!inscripciones.length) return;

    const grupos = await Grupo.find().lean();
    const gruposMap = new Map();
    for (const g of grupos) {
        const id = String(g.IdGrupo || g.idGrupo || "").trim();
        if (id) gruposMap.set(id.toUpperCase(), g);
    }

    const hoy = new Date();

    for (const ins of inscripciones) {
        const idAlumno = String(ins.idAlumno || "").trim();
        const grupoId = String(ins.grupoId || ins.GrupoId || "").trim();
        if (!idAlumno || !grupoId) continue;

        const grupo = gruposMap.get(grupoId.toUpperCase());
        const montoMensual = Number(ins.montoMensualidad);
        const diaPago = Number(ins.diaPago) || 1;

        const fechaInicio = new Date(ins.fechaInicioPago || ins.fechaInscripcion || hoy);
        
        // Generar pagos para los próximos 12 meses
        for (let i = 0; i < 12; i++) {
            const mes = new Date(fechaInicio);
            mes.setMonth(mes.getMonth() + i);
            const mesStr = `${mes.getFullYear()}-${String(mes.getMonth() + 1).padStart(2, "0")}`;
            const pagoId = crearPagoId(idAlumno, grupoId, mesStr);

            const pagoExistente = await Pago.findOne({ pagoId }).lean();
            let montoPago = montoMensual;
            let descuentoAplicado = 0;

            if (pagoExistente && pagoExistente.descuentoAplicado > 0) {
                montoPago = pagoExistente.montoPago;
                descuentoAplicado = pagoExistente.descuentoAplicado;
            }

            await Pago.updateOne(
                { pagoId },
                {
                    $set: {
                        pagoId,
                        idAlumno,
                        nombreAlumno: ins.nombreAlumno || idAlumno,
                        grupoId,
                        nombreCurso: grupo?.nombreCurso || "Curso",
                        diaPago: diaPago,
                        montoPago: montoPago,
                        fechaInicioPago: mes,
                        activo: true,
                        fechaBaja: null,
                        periodo: "Mes",
                        descuentoAplicado: descuentoAplicado,
                        notas: pagoExistente?.notas || "Generado automáticamente",
                    },
                },
                { upsert: true }
            );
        }
    }
}

// ============================================================
// GET /lista-completa – CON PAGOS REALES Y DESCUENTOS
// ============================================================
router.get("/lista-completa", async (req, res) => {
    try {
        await sincronizarPagosDesdeInscripciones();

        const pagos = await Pago.aggregate([
            { $match: { activo: true } },
            {
                $lookup: {
                    from: "abonos",
                    let: { idDelPago: "$pagoId" },
                    pipeline: [
                        { $match: { $expr: { $eq: ["$pagoId", "$$idDelPago"] } } },
                        { $sort: { fechaAbono: 1 } }
                    ],
                    as: "historialAbonos"
                }
            }
        ]);

        const alumnosMap = new Map();

        for (const pago of pagos) {
            const key = `${pago.idAlumno}-${pago.grupoId}`;
            if (!alumnosMap.has(key)) {
                alumnosMap.set(key, {
                    idAlumno: pago.idAlumno,
                    grupoId: pago.grupoId,
                    nombreAlumno: pago.nombreAlumno,
                    nombreCurso: pago.nombreCurso,
                    pagos: [],
                    montoTotal: 0,
                    montoPagado: 0,
                    historialAbonos: [],
                    activo: true,
                    fechaBaja: null,
                });
            }
            const alum = alumnosMap.get(key);
            alum.pagos.push(pago);
            const montoConDescuento = pago.montoPago * (1 - (pago.descuentoAplicado || 0) / 100);
            alum.montoTotal += montoConDescuento;
            const abonos = pago.historialAbonos || [];
            const pagado = abonos.reduce((sum, a) => sum + (a.montoAbono || 0), 0);
            alum.montoPagado += pagado;
            alum.historialAbonos = alum.historialAbonos.concat(abonos);
        }

        const resultadoFinal = [];

        for (const [key, alum] of alumnosMap) {
            const pagosOrdenados = alum.pagos.sort((a, b) => new Date(a.fechaInicioPago) - new Date(b.fechaInicioPago));

            const periodosMensuales = pagosOrdenados.map((pago) => {
                const fechaVencimiento = new Date(pago.fechaInicioPago);
                const abonosDelPago = pago.historialAbonos || [];
                const totalAbonado = abonosDelPago.reduce((sum, a) => sum + (a.montoAbono || 0), 0);
                const descuento = pago.descuentoAplicado || 0;
                const montoBase = pago.montoPago || 0;
                const montoPeriodo = montoBase * (1 - descuento / 100);
                const saldo = Math.max(0, montoPeriodo - totalAbonado);
                const status = totalAbonado >= montoPeriodo ? "Pagado" : (totalAbonado > 0 ? "Parcial" : "Pendiente");

                return {
                    clave: `${fechaVencimiento.getFullYear()}-${String(fechaVencimiento.getMonth() + 1).padStart(2, '0')}`,
                    nombreMes: fechaVencimiento.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }),
                    vencimiento: fechaVencimiento.toISOString(),
                    monto: montoPeriodo,
                    pagado: totalAbonado,
                    saldo: saldo,
                    status: status,
                    pagoId: pago.pagoId,
                    metodoAbono: abonosDelPago.length > 0 ? abonosDelPago[abonosDelPago.length - 1].metodoAbono : null,
                    fechaPagoReal: abonosDelPago.length > 0 ? abonosDelPago[abonosDelPago.length - 1].fechaAbono : null,
                    descuentoAplicado: descuento,
                };
            });

            const totalMonto = periodosMensuales.reduce((sum, m) => sum + m.monto, 0);
            const totalPagado = periodosMensuales.reduce((sum, m) => sum + m.pagado, 0);
            const saldoTotal = Math.max(0, totalMonto - totalPagado);
            const statusGeneral = saldoTotal === 0 ? "Pagado" : (totalPagado > 0 ? "Parcial" : "Pendiente");

            const hoy = new Date();
            const mesActual = periodosMensuales.find(m => {
                const v = new Date(m.vencimiento);
                return v.getMonth() === hoy.getMonth() && v.getFullYear() === hoy.getFullYear();
            }) || periodosMensuales.find(m => m.status !== "Pagado") || periodosMensuales[0];

            resultadoFinal.push({
                id: key,
                idAlumno: alum.idAlumno,
                grupoId: alum.grupoId,
                nombreAlumno: alum.nombreAlumno,
                nombreCurso: alum.nombreCurso,
                montoTotal: totalMonto,
                montoPagado: totalPagado,
                saldo: saldoTotal,
                status: statusGeneral,
                activo: alum.activo,
                fechaBaja: alum.fechaBaja,
                fechaLimite: mesActual?.vencimiento || null,
                periodosMensuales: periodosMensuales,
                cobroProgramado: false,
                metodoAbono: alum.historialAbonos.length > 0 ? alum.historialAbonos[alum.historialAbonos.length - 1].metodoAbono : null,
                fechaPagoReal: alum.historialAbonos.length > 0 ? alum.historialAbonos[alum.historialAbonos.length - 1].fechaAbono : null,
                saldoAFavor: 0,
            });
        }

        res.json(resultadoFinal);
    } catch (error) {
        console.error("Error en /lista-completa:", error);
        res.status(500).json({ error: "Error al obtener pagos" });
    }
});

// ============================================================
// PATCH /actualizar-dia/:id
// ============================================================
router.patch("/actualizar-dia/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { nuevoDia } = req.body;

        if (!nuevoDia || nuevoDia < 1 || nuevoDia > 31) {
            return res.status(400).json({ error: "Día de pago inválido (debe ser 1-31)" });
        }

        const pago = await Pago.findOne({ pagoId: id });
        if (!pago) {
            return res.status(404).json({ error: "Pago no encontrado" });
        }

        pago.diaPago = nuevoDia;
        pago.updatedAt = new Date();
        await pago.save();

        res.json({ ok: true, mensaje: "Día de pago actualizado", data: pago });
    } catch (error) {
        console.error("Error PATCH /actualizar-dia:", error);
        res.status(500).json({ error: error.message });
    }
});

export default router;