import express from "express";
import Profesor from "../models/Profesor.js";
import Grupo from "../models/Grupo.js";
import Inscripcion from "../models/Inscripcion.js";
import Pago from "../models/Pago.js";

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

export default router;