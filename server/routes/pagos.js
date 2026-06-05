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
    const existe = await Pago.findOne({ pagoId }).lean();
    if (existe) continue;

    const grupo = gruposMap.get(grupoId.toUpperCase());
    await crearOActualizarPagoDeInscripcion({
      idAlumno,
      nombreAlumno: ins.nombreAlumno || idAlumno,
      grupoId,
      nombreCurso: grupo?.nombreCurso || "Curso",
      datosPago: {
        montoMensualidad: Number(ins.montoMensualidad),
        diaPago: Number(ins.diaPago) || 1,
        fechaInicioPago: ins.fechaInicioPago || ins.fechaInscripcion || new Date(),
        comentarios: ins.comentarios || "",
      },
    });
  }
}

router.get("/lista-completa", async (req, res) => {
    try {
        await sincronizarPagosDesdeInscripciones();

        const hoy = new Date();
        const mesActual = hoy.getMonth();
        const anioActual = hoy.getFullYear();

        const respuestaProcesada = await Pago.aggregate([
            {
                // Unimos la colección de Pagos con Abonos
                $lookup: {
                    from: "abonos",
                    let: { idDelPago: "$pagoId" },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ["$pagoId", "$$idDelPago"] }
                            }
                        },
                        { $sort: { fechaAbono: 1 } } // <--- Garatiza que el orden sea del más viejo al más reciente
                    ],
                    as: "historialAbonos"
                }
            },
            {
                $addFields: {
                    diaPagoResuelto: {
                        $ifNull: ["$diaPago", "$diaPagoFijo"]
                    },
                    fechaInicioResuelta: {
                        $ifNull: ["$fechaInicioPago", "$fechaPago"]
                    }
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
                // Calculamos Saldo y Estatus basándonos en la suma histórica
                $addFields: {
                    saldo: { $subtract: ["$montoTotal", "$montoPagado"] }
                }
            },
            {
                // Definimos el Estatus
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
                $sort: {
                    fechaPagoReal: -1
                }
            }
        ]);

        const resultadoFinal = respuestaProcesada.map((p) => {
            const hoy = new Date();
            const diaPago = Number(p.diaPagoFijo) || 1;
            const fechaInicio = p.fechaPago ? new Date(p.fechaPago) : null;
            const programado =
              fechaInicio && cobroAunNoInicia(fechaInicio, hoy);

            const periodosMensuales = construirPeriodosMensuales({
              fechaInicioCobro: fechaInicio,
              diaPagoFijo: diaPago,
              montoMensualidad: p.montoTotal,
              abonos: p.historialAbonos || [],
              hoy,
              mesesFuturosVisibles: 0,
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
              const primerMes =
                periodosMensuales.find((mes) => mes.status === "Programado") ||
                periodosMensuales[0];
              saldo = Number(
                primerMes?.saldo ?? primerMes?.monto ?? p.montoTotal ?? 0
              );
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
              mesCobroVigente:
                periodoVigente?.nombreMes ||
                (fechaInicio
                  ? fechaInicio.toLocaleDateString("es-MX", {
                      month: "long",
                      year: "numeric",
                    })
                  : ""),
              cobroProgramado: programado,
            };
        });

        res.json(resultadoFinal);

    } catch (error) {
        console.error("Error en agregación:", error);
        res.status(500).json({ error: "Error al procesar pagos optimizados" });
    }
});

router.patch("/actualizar-dia/:id", async (req, res) => {
    try {
        const { nuevoDia } = req.body;
        const { id } = req.params;

        if (!nuevoDia || nuevoDia < 1 || nuevoDia > 31) {
            return res.status(400).json({ error: "Día inválido (debe ser 1-31)" });
        }

        const hoy = new Date();
        const ultimoDiaMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate();
        const diaPago = Math.min(Number(nuevoDia), ultimoDiaMes);

        const regexId = new RegExp(`^\\s*${id}\\s*$`, "i");

        const resultado = await Pago.findOneAndUpdate(
            { pagoId: regexId },
            {
                diaPagoFijo: Number(nuevoDia),
                fechaPago: new Date(hoy.getFullYear(), hoy.getMonth(), diaPago)
            },
            { returnDocument: 'after' }
        );

        if (!resultado) return res.status(404).json({ error: "Alumno no encontrado" });

        res.json({ message: "Día de pago actualizado correctamente", data: resultado });
    } catch (error) {
        res.status(500).json({ error: "Error al actualizar la fecha" });
    }
});

export default router;
