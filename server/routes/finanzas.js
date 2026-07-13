import express from "express";
import Pago from "../models/Pago.js";
import Gasto from "../models/Gasto.js";
import Alumno from "../models/Alumno.js";

const router = express.Router();

// Helper para obtener el mes a partir de una fecha
function obtenerMes(fecha) {
  const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  return meses[fecha.getMonth()];
}

// 1. Resumen financiero (Ingresos, Gastos, Utilidad)
router.get("/resumen", async (req, res) => {
  try {
    const { anio } = req.query;
    const year = parseInt(anio) || new Date().getFullYear();

    // Ingresos totales del año (suma de montos de pago)
    const ingresos = await Pago.aggregate([
      {
        $match: {
          $expr: { $eq: [{ $year: "$fechaInicioPago" }, year] }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$montoPago" }
        }
      }
    ]);

    // Gastos totales del año
    const gastos = await Gasto.aggregate([
      {
        $match: { anio: year }
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$monto" }
        }
      }
    ]);

    const totalIngresos = ingresos.length > 0 ? ingresos[0].total : 0;
    const totalGastos = gastos.length > 0 ? gastos[0].total : 0;
    const utilidad = totalIngresos - totalGastos;

    res.json({
      anio: year,
      ingresos: totalIngresos,
      gastos: totalGastos,
      utilidad,
      porcentajeUtilidad: totalIngresos > 0 ? (utilidad / totalIngresos) * 100 : 0
    });
  } catch (error) {
    console.error("Error en /resumen:", error);
    res.status(500).json({ error: "Error al obtener resumen financiero" });
  }
});

// 2. Rentabilidad por profesor (similar a tu tabla de productividad)
router.get("/rentabilidad-profesores", async (req, res) => {
  try {
    const { anio, mes } = req.query;
    const year = parseInt(anio) || new Date().getFullYear();

    // Filtro de pagos por año y mes (si se proporciona)
    const matchPagos = { $expr: { $eq: [{ $year: "$fechaInicioPago" }, year] } };
    if (mes) {
      matchPagos.$expr.$and = [
        { $eq: [{ $year: "$fechaInicioPago" }, year] },
        { $eq: [{ $month: "$fechaInicioPago" }, new Date(mes + " 1, 2000").getMonth() + 1] }
      ];
    }

    // Obtener ingresos agrupados por profesor
    // Nota: Asumimos que el profesor está en el campo "nombreCurso" o se puede inferir.
    // Si tienes un campo "profesor" en Pago, deberías usarlo.
    // Aquí haremos una agregación por "nombreCurso" como proxy (ajústalo según tu modelo).
    const ingresosPorProfesor = await Pago.aggregate([
      { $match: matchPagos },
      {
        $group: {
          _id: "$nombreCurso", // Cambiar por el campo real de profesor
          totalIngresos: { $sum: "$montoPago" },
          numAlumnos: { $addToSet: "$idAlumno" }
        }
      },
      {
        $project: {
          profesor: "$_id",
          totalIngresos: 1,
          numAlumnos: { $size: "$numAlumnos" }
        }
      }
    ]);

    // Aquí podrías obtener el costo por hora de cada profesor desde otro modelo
    // Por ahora, devolvemos los ingresos y el número de alumnos
    res.json(ingresosPorProfesor);
  } catch (error) {
    console.error("Error en /rentabilidad-profesores:", error);
    res.status(500).json({ error: "Error al obtener rentabilidad por profesor" });
  }
});

// 3. Ingresos mensuales (para gráficos)
router.get("/ingresos-mensuales", async (req, res) => {
  try {
    const { anio } = req.query;
    const year = parseInt(anio) || new Date().getFullYear();

    const ingresos = await Pago.aggregate([
      {
        $match: {
          $expr: { $eq: [{ $year: "$fechaInicioPago" }, year] }
        }
      },
      {
        $group: {
          _id: { $month: "$fechaInicioPago" },
          total: { $sum: "$montoPago" }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const resultado = meses.map((mes, idx) => {
      const mesData = ingresos.find(i => i._id === idx + 1);
      return { mes, total: mesData ? mesData.total : 0 };
    });

    res.json(resultado);
  } catch (error) {
    console.error("Error en /ingresos-mensuales:", error);
    res.status(500).json({ error: "Error al obtener ingresos mensuales" });
  }
});

// 4. Gastos mensuales
router.get("/gastos-mensuales", async (req, res) => {
  try {
    const { anio } = req.query;
    const year = parseInt(anio) || new Date().getFullYear();

    const gastos = await Gasto.aggregate([
      { $match: { anio: year } },
      {
        $group: {
          _id: "$mes",
          total: { $sum: "$monto" }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const resultado = meses.map(mes => {
      const mesData = gastos.find(g => g._id === mes);
      return { mes, total: mesData ? mesData.total : 0 };
    });

    res.json(resultado);
  } catch (error) {
    console.error("Error en /gastos-mensuales:", error);
    res.status(500).json({ error: "Error al obtener gastos mensuales" });
  }
});

export default router;