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

    // Mapear cada abono directamente (sin join con Pago)
    const abonosConNombre = abonos.map((abono) => ({
      fecha: abono.fechaAbono || abono.createdAt,
      estudiante: abono.nombreAlumno || "Alumno desconocido",
      monto: abono.montoAbono || 0,
      metodoPago: abono.metodoAbono || "Efectivo",
      concepto: "Abono",
      factura: false,
      recibidoPor: abono.recibidoPor || "Sistema",
      saldoAFavor: abono.saldoAFavor || 0,
      observaciones: abono.observaciones || "",
      periodoFacturacion: abono.periodoFacturacion || "",
      estatus: abono.estatus || "",
      notas: abono.notas || "",
      grupoId: abono.grupoId || "", // si existe el campo
    }));

    // Totales por mes (opcional, pero se mantiene)
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
// (No se modifica, se incluye por contexto)
// ============================================================
router.get("/rentabilidad-profesores", async (req, res) => {
  try {
    const { mes, anio } = req.query;

    // Lógica para calcular rentabilidad por profesor (ya existente)
    // ... (código original, no se modifica)

    // Respuesta de ejemplo (reemplazar con tu lógica real)
    res.json([]);
  } catch (error) {
    console.error("❌ Error en GET /reportes/rentabilidad-profesores:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;