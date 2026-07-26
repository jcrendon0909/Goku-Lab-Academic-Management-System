import express from "express";
import Abono from "../models/Abono.js";
import Pago from "../models/Pago.js";
import Grupo from "../models/Grupo.js";
import Profesor from "../models/Profesor.js";
import Alumno from "../models/Alumno.js";
import Inscripcion from "../models/Inscripcion.js";

const router = express.Router();

// ============================================================
// GET /pagos - Reporte de cobranza (abonos con nombres de alumnos)
// ============================================================
router.get("/pagos", async (req, res) => {
  try {
    const { mes, anio } = req.query;

    // Construir filtro de fecha (opcional)
    const filtro = {};
    if (mes && anio) {
      const fechaInicio = new Date(anio, mes - 1, 1);
      const fechaFin = new Date(anio, mes, 0, 23, 59, 59);
      filtro.fechaAbono = { $gte: fechaInicio, $lte: fechaFin };
    }

    // Obtener todos los abonos que cumplan el filtro
    const abonos = await Abono.find(filtro).lean();

    // Mapear cada abono para enriquecerlo con datos del pago y alumno
    const abonosConNombre = await Promise.all(
      abonos.map(async (abono) => {
        // 1. Obtener el pago asociado al abono
        const pago = await Pago.findOne({ idPago: abono.pagoId }).lean();

        // 2. Obtener el nombre del alumno desde el pago (si existe)
        let estudiante = "Alumno desconocido";
        let grupoId = "";
        let metodoPago = abono.metodoAbono || "Efectivo";
        let concepto = "Abono";
        let factura = false;
        let recibidoPor = abono.recibidoPor || "Sistema";

        if (pago) {
          estudiante = pago.nombreAlumno || "Alumno desconocido";
          grupoId = pago.grupoId || "";
          // Si el abono no tiene método, tomar el del pago (opcional)
          if (!abono.metodoAbono && pago.metodoPago) {
            metodoPago = pago.metodoPago;
          }
        }

        // 3. Retornar el objeto enriquecido (formato que espera el frontend)
        return {
          fecha: abono.fechaAbono || abono.createdAt,
          estudiante: estudiante,
          monto: abono.montoAbono || 0,
          metodoPago: metodoPago,
          concepto: concepto,
          factura: factura,
          recibidoPor: recibidoPor,
          saldoAFavor: abono.saldoAFavor || 0,
          observaciones: abono.observaciones || "",
          periodoFacturacion: abono.periodoFacturacion || "",
          estatus: abono.estatus || "",
          notas: abono.notas || "",
          grupoId: grupoId,
        };
      })
    );

    // También calculamos los totales por mes (opcional, pero lo dejamos como estaba)
    const totales = await Abono.aggregate([
      { $match: filtro },
      {
        $group: {
          _id: {
            mes: { $month: "$fechaAbono" },
            anio: { $year: "$fechaAbono" },
          },
          total: { $sum: "$montoAbono" },
          cantidad: { $sum: 1 },
        },
      },
      { $sort: { "_id.anio": -1, "_id.mes": -1 } },
    ]);

    res.json({
      abonos: abonosConNombre,
      totales: totales,
    });
  } catch (error) {
    console.error("❌ Error en GET /reportes/pagos:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// GET /rentabilidad-profesores - Reporte de rentabilidad
// (No se modifica, solo se incluye por contexto)
// ============================================================
router.get("/rentabilidad-profesores", async (req, res) => {
  try {
    const { mes, anio } = req.query;

    // Lógica para calcular rentabilidad por profesor (ya existente)
    // ... (código original, no se modifica)

    // Respuesta de ejemplo
    res.json([]);
  } catch (error) {
    console.error("❌ Error en GET /reportes/rentabilidad-profesores:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;