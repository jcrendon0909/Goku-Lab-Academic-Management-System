import express from "express";
import Pago from "../models/Pago.js";

const router = express.Router();

router.get("/lista-completa", async (req, res) => {
    try {
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
                // datos de cada alumno
                $project: {
                    _id: 0,
                    id: { $toUpper: { $trim: { input: "$pagoId" } } },
                    idAlumno: 1,
                    grupoId: 1,
                    nombreAlumno: 1,
                    nombreCurso: 1,
                    montoTotal: { $toDouble: "$montoPago" },
                    diaPagoFijo: 1,
                    fechaPago: 1,
                    activo: { $ifNull: ["$activo", true] },
                    fechaBaja: 1,
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

        // Ajuste final para las fechas límite (se hace en JS porque depende de la fecha de hoy)
        const resultadoFinal = respuestaProcesada.map(p => {
            const ultimoDiaMes = new Date(anioActual, mesActual + 1, 0).getDate();
            const diaPago = Number(p.diaPagoFijo) || 1;
            const diaLimite = Math.min(Math.max(diaPago, 1), ultimoDiaMes);

            return {
                ...p,
                saldo: p.saldo < 0 ? 0 : p.saldo,
                fechaLimite: new Date(anioActual, mesActual, diaLimite).toISOString()
            };
        });

        res.json(resultadoFinal);

    } catch (error) {
        console.error("Error en agregación:", error);
        res.status(500).json({ error: "Error al procesar pagos optimizados" });
    }
});

// Ruta para cambiar el día de pago fijo del alumno
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

        // Actualizamos en la colección 'pagos'
        const resultado = await Pago.findOneAndUpdate(
            { pagoId: id },
            {
                diaPagoFijo: Number(nuevoDia),
                fechaPago: new Date(hoy.getFullYear(), hoy.getMonth(), diaPago)
            },
            { new: true }
        );

        if (!resultado) return res.status(404).json({ error: "Alumno no encontrado" });

        res.json({ message: "Día de pago actualizado correctamente", data: resultado });
    } catch (error) {
        res.status(500).json({ error: "Error al actualizar la fecha" });
    }
});

export default router;
