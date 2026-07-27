import express from "express";
import Pago from "../models/Pago.js";
import Inscripcion from "../models/Inscripcion.js";
import Grupo from "../models/Grupo.js";
import {
    cobroAunNoInicia,
    construirPeriodosMensuales,
    crearOActualizarPagoDeInscripcion,
    crearPagoId,
    indiceMes,
} from "../utils/pagos.js";

const router = express.Router();

// ============================================================
// FUNCIÓN PARA SINCRONIZAR PAGOS DESDE INSCRIPCIONES
// (ACTUALIZADA PARA ACTUALIZAR PAGOS EXISTENTES)
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

    for (const ins of inscripciones) {
        const idAlumno = String(ins.idAlumno || "").trim();
        const grupoId = String(ins.grupoId || ins.GrupoId || "").trim();
        if (!idAlumno || !grupoId) continue;

        const pagoId = crearPagoId(idAlumno, grupoId);
        const grupo = gruposMap.get(grupoId.toUpperCase());

        // ✅ ACTUALIZAR O CREAR (upsert) para mantener consistencia
        await Pago.updateOne(
            { pagoId },
            {
                $set: {
                    idAlumno,
                    nombreAlumno: ins.nombreAlumno || idAlumno,
                    grupoId,
                    nombreCurso: grupo?.nombreCurso || "Curso",
                    diaPago: Number(ins.diaPago) || 1,
                    montoPago: Number(ins.montoMensualidad),
                    fechaInicioPago: ins.fechaInicioPago || ins.fechaInscripcion || new Date(),
                    activo: true,
                    fechaBaja: null,
                },
            },
            { upsert: true }
        );
    }
}

// ============================================================
// GET /lista-completa - CON FILTRO DE PAGOS ACTIVOS
// ============================================================
router.get("/lista-completa", async (req, res) => {
    try {
        await sincronizarPagosDesdeInscripciones();

        const hoy = new Date();

        const respuestaProcesada = await Pago.aggregate([
            // 🔥 CORRECCIÓN: FILTRAR SOLO PAGOS ACTIVOS
            {
                $match: {
                    activo: true,
                },
            },
            {
                $lookup: {
                    from: "abonos",
                    let: { idDelPago: "$pagoId" },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ["$pagoId", "$$idDelPago"] }
                            }
                        },
                        { $sort: { fechaAbono: 1 } }
                    ],
                    as: "historialAbonos"
                }
            },
            {
                $addFields: {
                    diaPagoResuelto: { $ifNull: ["$diaPago", "$diaPagoFijo"] },
                    fechaInicioResuelta: { $ifNull: ["$fechaInicioPago", "$fechaPago"] }
                }
            },
            {
                $project: {
                    _id: 0,
                    id: { $toUpper: { $trim: { input: "$pagoId" } } },
                    idAlumno: 1,
                    grupoId: 1,
                    nombreAlumno: 1,
                    nombreCurso: 1,
                    montoTotal: { $toDouble: "$montoPago" },
                    diaPagoFijo: "$diaPagoResuelto",
                    fechaPago: "$fechaInicioResuelta",
                    activo: { $ifNull: ["$activo", true] },
                    fechaBaja: 1,
                    historialAbonos: {
                        $map: {
                            input: "$historialAbonos",
                            as: "a",
                            in: {
                                abonoId: "$$a.abonoId",
                                fechaAbono: "$$a.fechaAbono",
                                montoAbono: { $toDouble: "$$a.montoAbono" },
                                metodoAbono: "$$a.metodoAbono",
                            }
                        }
                    },
                    montoPagado: {
                        $sum: {
                            $map: {
                                input: "$historialAbonos",
                                as: "a",
                                in: { $toDouble: "$$a.montoAbono" }
                            }
                        }
                    },
                    metodoAbono: {
                        $cond: {
                            if: { $gt: [{ $size: "$historialAbonos" }, 0] },
                            then: { $last: "$historialAbonos.metodoAbono" },
                            else: "No registrado"
                        }
                    },
                    fechaPagoReal: {
                        $cond: {
                            if: { $gt: [{ $size: "$historialAbonos" }, 0] },
                            then: { $last: "$historialAbonos.fechaAbono" },
                            else: null
                        }
                    }
                }
            },
            {
                $addFields: {
                    saldo: { $subtract: ["$montoTotal", "$montoPagado"] }
                }
            },
            {
                $addFields: {
                    status: {
                        $cond: {
                            if: { $gte: ["$montoPagado", "$montoTotal"] },
                            then: "Pagado",
                            else: {
                                $cond: {
                                    if: { $gt: ["$montoPagado", 0] },
                                    then: "Parcial",
                                    else: "Pendiente"
                                }
                            }
                        }
                    }
                }
            },
            {
                $sort: { fechaPagoReal: -1 }
            }
        ]);

        const resultadoFinal = respuestaProcesada.map((p) => {
            const hoy = new Date();
            const diaPago = Number(p.diaPagoFijo) || 1;
            const fechaInicio = p.fechaPago ? new Date(p.fechaPago) : null;
            const programado = fechaInicio && cobroAunNoInicia(fechaInicio, hoy);

            const periodosMensuales = construirPeriodosMensuales({
                fechaInicioCobro: fechaInicio,
                diaPagoFijo: diaPago,
                montoMensualidad: p.montoTotal,
                abonos: p.historialAbonos || [],
                hoy,
                mesesFuturosVisibles: 3,
            });

            const periodoVigente =
                periodosMensuales.find((mes) => {
                    const idx = indiceMes(new Date(mes.vencimiento));
                    return idx === indiceMes(hoy);
                }) ||
                periodosMensuales.find((mes) => mes.status !== "Programado") ||
                periodosMensuales[0];

            let status = p.status;
            let saldo = p.saldo < 0 ? 0 : p.saldo;
            let fechaLimite = periodoVigente?.vencimiento || p.fechaPago;

            if (p.activo === false) {
                status = "Baja";
                saldo = 0;
            } else if (programado) {
                status = "Programado";
                const primerMes = periodosMensuales.find((mes) => mes.status === "Programado") || periodosMensuales[0];
                saldo = Number(primerMes?.saldo ?? primerMes?.monto ?? p.montoTotal ?? 0);
                fechaLimite = primerMes?.vencimiento || fechaLimite;
            } else if (periodoVigente) {
                fechaLimite = periodoVigente.vencimiento;
                saldo = periodoVigente.saldo;
                if (periodoVigente.status === "Pagado") status = "Pagado";
                else if (periodoVigente.status === "Parcial") status = "Parcial";
                else if (periodoVigente.status === "Pendiente") status = "Pendiente";
            }

            return {
                ...p,
                status,
                saldo,
                fechaLimite,
                periodosMensuales,
                mesCobroVigente: periodoVigente?.nombreMes || (fechaInicio ? fechaInicio.toLocaleDateString("es-MX", { month: "long", year: "numeric" }) : ""),
                cobroProgramado: programado,
            };
        });

        res.json(resultadoFinal);

    } catch (error) {
        console.error("Error en agregación:", error);
        res.status(500).json({ error: "Error al procesar pagos optimizados" });
    }
});

// ============================================================
// PATCH /actualizar-dia/:id - (SIN CAMBIOS)
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