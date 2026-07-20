import express from "express";
import Profesor from "../models/Profesor.js";
import Grupo from "../models/Grupo.js";
import Inscripcion from "../models/Inscripcion.js";
import Pago from "../models/Pago.js";
import Abono from "../models/Abono.js";  // ← Importar si no está

const router = express.Router();

function extraerHoras(duracionStr) {
  if (!duracionStr) return 0;
  const match = duracionStr.match(/(\d+(?:\.\d+)?)/);
  return match ? parseFloat(match[1]) : 0;
}

// GET /api/reportes/rentabilidad-profesores
router.get("/rentabilidad-profesores", async (req, res) => {
  try {
    const { mes, anio } = req.query;

    const profesores = await Profesor.find({ estatus: "Activo" }).lean();
    const grupos = await Grupo.find({ Estatus: "Activo" }).lean();
    const inscripciones = await Inscripcion.find({ estatus: "Activo" }).lean();

    let filtroPagos = {};
    if (mes && anio) {
      filtroPagos = { mesCorrespondiente: mes, anio: parseInt(anio) };
    }
    const pagos = await Pago.find(filtroPagos).lean();

    const pagosMap = new Map();
    for (const p of pagos) {
      const key = `${p.idAlumno}|${p.grupoId}`;
      pagosMap.set(key, (pagosMap.get(key) || 0) + p.montoPago);
    }

    const gruposPorProfesor = {};
    for (const g of grupos) {
      const idProf = g.idProfesor;
      if (!idProf) continue;
      if (!gruposPorProfesor[idProf]) gruposPorProfesor[idProf] = [];
      gruposPorProfesor[idProf].push(g);
    }

    const resultados = [];

    for (const prof of profesores) {
      const id = prof.idProfesor;
      const gruposDelProf = gruposPorProfesor[id] || [];

      let totalHorasSemana = 0;
      for (const g of gruposDelProf) {
        totalHorasSemana += extraerHoras(g.duracionClase);
      }
      const totalHorasMes = totalHorasSemana * 4;

      // ===== CÁLCULO DEL COSTO SEGÚN TIPO DE PAGO =====
      let costo = 0;
      if (prof.tipoPago === 'fijo_mensual') {
        costo = prof.salarioMensual || 0;
      } else {
        // Por defecto 'por_hora'
        costo = totalHorasMes * (prof.salarioPorHora || 0);
      }

      let ingresos = 0;
      for (const g of gruposDelProf) {
        const grupoId = g.IdGrupo;
        const alumnosInscritos = inscripciones.filter(ins => ins.grupoId === grupoId);
        for (const ins of alumnosInscritos) {
          const key = `${ins.idAlumno}|${grupoId}`;
          ingresos += pagosMap.get(key) || 0;
        }
      }

      const utilidad = ingresos - costo;
      const porcentaje = costo > 0 ? (utilidad / costo) * 100 : 0;

      resultados.push({
        idProfesor: id,
        nombre: prof.nombre,
        totalHorasSemana,
        totalHorasMes,
        salarioPorHora: prof.salarioPorHora || 0,
        tipoPago: prof.tipoPago || 'por_hora',
        salarioMensual: prof.salarioMensual || 0,
        costo,
        ingresos,
        utilidad,
        porcentaje: parseFloat(porcentaje.toFixed(2)),
        grupos: gruposDelProf.length,
      });
    }

    res.json(resultados);
  } catch (error) {
    console.error("ERROR RENTABILIDAD:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// REPORTE DE PAGOS HISTÓRICOS (similar al Excel)
// ============================================================

// GET /api/reportes/pagos?mes=&anio=&metodo=&factura=
router.get("/pagos", async (req, res) => {
  try {
    const { mes, anio, metodo, factura } = req.query;
    const filtro = {};

    // Filtro por mes/año si se proporcionan
    if (mes && anio) {
      const start = new Date(anio, mes - 1, 1);
      const end = new Date(anio, mes, 1);
      filtro.fechaAbono = { $gte: start, $lt: end };
    }
    if (metodo) filtro.metodoAbono = metodo;
    if (factura) filtro.facturaRequerida = factura === 'true';

    // Obtener los abonos con datos relacionados
    const abonos = await Abono.aggregate([
      { $match: filtro },
      {
        $lookup: {
          from: "pagos",
          localField: "idPago",
          foreignField: "_id",
          as: "pago"
        }
      },
      { $unwind: "$pago" },
      {
        $lookup: {
          from: "alumnos",
          localField: "pago.idAlumno",
          foreignField: "idAlumno",
          as: "alumno"
        }
      },
      { $unwind: "$alumno" },
      {
        $lookup: {
          from: "inscripciones",
          let: { idAlumno: "$alumno.idAlumno", grupoId: "$pago.grupoId" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$idAlumno", "$$idAlumno"] },
                    { $eq: ["$grupoId", "$$grupoId"] }
                  ]
                }
              }
            }
          ],
          as: "inscripcion"
        }
      },
      { $unwind: { path: "$inscripcion", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          fecha: "$fechaAbono",
          estudiante: "$alumno.nombreAlumno",
          monto: "$montoAbono",
          metodoPago: "$metodoAbono",
          concepto: "$pago.concepto",
          factura: "$pago.facturaRequerida",
          recibidoPor: "$pago.recibidoPor",
          saldoAFavor: "$pago.saldoAFavor",
          observaciones: "$pago.observaciones",
          periodoFacturacion: "$pago.periodoFacturacion",
          estatus: "$pago.estatus",
          notas: "$pago.notasInternas",
          mesCorrespondiente: "$pago.mesCorrespondiente",
          anioCorrespondiente: "$pago.anio"
        }
      },
      { $sort: { fecha: -1 } }
    ]);

    // Totales agrupados por mes/año
    const totales = await Abono.aggregate([
      { $match: filtro },
      {
        $group: {
          _id: {
            anio: { $year: "$fechaAbono" },
            mes: { $month: "$fechaAbono" }
          },
          total: { $sum: "$montoAbono" },
          cantidad: { $sum: 1 }
        }
      },
      { $sort: { "_id.anio": -1, "_id.mes": -1 } }
    ]);

    res.json({ abonos, totales });
  } catch (error) {
    console.error("Error en /reportes/pagos:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/reportes/pagos/resumen
router.get("/pagos/resumen", async (req, res) => {
  try {
    // Agrupar por método de pago y facturación
    const resumen = await Abono.aggregate([
      {
        $group: {
          _id: {
            metodo: "$metodoAbono",
            factura: "$facturaRequerida"
          },
          total: { $sum: "$montoAbono" },
          cantidad: { $sum: 1 }
        }
      },
      { $sort: { "_id.metodo": 1 } }
    ]);
    res.json(resumen);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/reportes/pagos/:pagoId (para recibo)
router.get("/pagos/:pagoId", async (req, res) => {
  try {
    const { pagoId } = req.params;
    const pago = await Pago.findById(pagoId)
      .populate('idAlumno')
      .lean();
    if (!pago) return res.status(404).json({ error: "Pago no encontrado" });

    // Obtener abonos asociados
    const abonos = await Abono.find({ idPago: pagoId }).lean();
    const totalAbonado = abonos.reduce((sum, a) => sum + a.montoAbono, 0);

    res.json({ pago, abonos, totalAbonado });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;