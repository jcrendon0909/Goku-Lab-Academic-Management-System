import express from "express";
import Profesor from "../models/Profesor.js";
import Grupo from "../models/Grupo.js";
import Inscripcion from "../models/Inscripcion.js";
import Pago from "../models/Pago.js";

const router = express.Router();

// Función auxiliar para extraer horas de "duracionClase" (ej. "2 horas", "1.5 hrs")
function extraerHoras(duracionStr) {
  if (!duracionStr) return 0;
  const match = duracionStr.match(/(\d+(?:\.\d+)?)/);
  return match ? parseFloat(match[1]) : 0;
}

// GET /api/reportes/rentabilidad-profesores
// Filtros opcionales: ?mes=Ene&anio=2026 (para ingresos de un mes específico)
router.get("/rentabilidad-profesores", async (req, res) => {
  try {
    const { mes, anio } = req.query;

    // 1. Obtener todos los profesores activos
    const profesores = await Profesor.find({ estatus: "Activo" }).lean();

    // 2. Obtener todos los grupos activos
    const grupos = await Grupo.find({ Estatus: "Activo" }).lean();

    // 3. Obtener inscripciones activas (suponiendo que tienen estatus "Activo")
    const inscripciones = await Inscripcion.find({ estatus: "Activo" }).lean();

    // 4. Obtener pagos (con filtro de mes/año si se proporciona)
    let filtroPagos = {};
    if (mes && anio) {
      filtroPagos = { mesCorrespondiente: mes, anio: parseInt(anio) };
    }
    const pagos = await Pago.find(filtroPagos).lean();

    // Construir mapa de pagos por alumno y grupo (suma de montos)
    const pagosMap = new Map();
    for (const p of pagos) {
      const key = `${p.idAlumno}|${p.grupoId}`;
      pagosMap.set(key, (pagosMap.get(key) || 0) + p.montoPago);
    }

    // 4. Agrupar grupos por profesor
    const gruposPorProfesor = {};
    for (const g of grupos) {
      const idProf = g.idProfesor;
      if (!idProf) continue;
      if (!gruposPorProfesor[idProf]) gruposPorProfesor[idProf] = [];
      gruposPorProfesor[idProf].push(g);
    }

    // 5. Calcular rentabilidad por profesor
    const resultados = [];

    for (const prof of profesores) {
      const id = prof.idProfesor;
      const gruposDelProf = gruposPorProfesor[id] || [];

      // Calcular total de horas por semana (suma de duraciones de cada grupo)
      let totalHorasSemana = 0;
      for (const g of gruposDelProf) {
        totalHorasSemana += extraerHoras(g.duracionClase);
      }

      // Horas al mes (aprox. 4 semanas)
      const totalHorasMes = totalHorasSemana * 4;

      // Costo mensual del profesor
      const costo = totalHorasMes * (prof.salarioPorHora || 0);

      // Ingresos generados: sumar pagos de alumnos inscritos en estos grupos
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