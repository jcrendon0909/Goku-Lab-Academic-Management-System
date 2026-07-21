import express from "express";
import Profesor from "../models/Profesor.js";
import Grupo from "../models/Grupo.js";
import Inscripcion from "../models/Inscripcion.js";
import Pago from "../models/Pago.js";
import Abono from "../models/Abono.js";

const router = express.Router();

function extraerHoras(duracionStr) {
  if (!duracionStr) return 0;
  const match = duracionStr.match(/(\d+(?:\.\d+)?)/);
  return match ? parseFloat(match[1]) : 0;
}

// ============================================================
// REPORTE DE RENTABILIDAD DE PROFESORES (CORREGIDO)
// ============================================================
router.get("/rentabilidad-profesores", async (req, res) => {
  try {
    const { mes, anio } = req.query;
    console.log(`📊 Generando reporte de rentabilidad - Mes: ${mes || 'todos'}, Año: ${anio || 'todos'}`);

    // 1. Obtener datos
    const profesores = await Profesor.find({ estatus: "Activo" }).lean();
    const grupos = await Grupo.find({ Estatus: "Activo" }).lean();
    const inscripciones = await Inscripcion.find({ estatus: "Activo" }).lean();

    // Filtrar pagos por mes/año si se proporciona
    let filtroPagos = {};
    if (mes && anio) {
      // Asumiendo que los pagos tienen campo `mesCorrespondiente` y `anio`
      filtroPagos = { mesCorrespondiente: mes, anio: parseInt(anio) };
    }
    const pagos = await Pago.find(filtroPagos).lean();
    console.log(`📋 Pagos encontrados: ${pagos.length}`);

    // Mapa de pagos por alumno-grupo
    const pagosMap = new Map();
    for (const p of pagos) {
      const key = `${p.idAlumno}|${p.grupoId}`;
      const monto = p.montoPago || p.montoAbonado || 0;
      pagosMap.set(key, (pagosMap.get(key) || 0) + monto);
    }

    // Agrupar grupos por profesor
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

      // Calcular horas
      let totalHorasSemana = 0;
      for (const g of gruposDelProf) {
        totalHorasSemana += extraerHoras(g.duracionClase);
      }
      const totalHorasMes = totalHorasSemana * 4;

      // Calcular costo (salario del profesor)
      let costo = 0;
      if (prof.tipoPago === 'fijo_mensual') {
        costo = prof.salarioMensual || 0;
      } else {
        costo = totalHorasMes * (prof.salarioPorHora || 0);
      }

      // ---- NUEVO CÁLCULO DE INGRESOS ----
      let ingresos = 0;
      const gruposConAlumnos = [];

      for (const g of gruposDelProf) {
        const grupoId = g.IdGrupo || g.idGrupo;
        const alumnosInscritos = inscripciones.filter(ins => ins.grupoId === grupoId);
        console.log(`🔍 Grupo ${grupoId} - Alumnos inscritos: ${alumnosInscritos.length}`);

        // Intentar obtener monto mensualidad de la primera inscripción
        let montoMensualidad = 0;
        if (alumnosInscritos.length > 0) {
          // Buscar en la inscripción
          montoMensualidad = alumnosInscritos[0].montoMensualidad || 0;
          // Si no tiene, buscar en el grupo
          if (!montoMensualidad) {
            montoMensualidad = g.montoMensualidad || 0;
          }
          // Si sigue sin tener, buscar en pagos reales (suma de pagos de alumnos en este grupo)
          if (!montoMensualidad) {
            // Calcular el total pagado por todos los alumnos de este grupo
            let totalPagadoGrupo = 0;
            for (const ins of alumnosInscritos) {
              const key = `${ins.idAlumno}|${grupoId}`;
              totalPagadoGrupo += pagosMap.get(key) || 0;
            }
            // Si hay pagos, el monto mensual es el promedio por alumno (para estimar)
            if (alumnosInscritos.length > 0 && totalPagadoGrupo > 0) {
              montoMensualidad = Math.round(totalPagadoGrupo / alumnosInscritos.length);
              console.log(`💡 Estimando monto mensual desde pagos: ${montoMensualidad}`);
            } else {
              console.warn(`⚠️ No se encontró monto para grupo ${grupoId}`);
            }
          }
        }

        // Si aun no hay monto, intentar obtener del curso (si existe relación)
        if (!montoMensualidad && g.idCurso) {
          // Podrías hacer un lookup a Curso si tienes el modelo importado
          // const curso = await Curso.findById(g.idCurso).lean();
          // if (curso) montoMensualidad = curso.precio || 0;
        }

        console.log(`💰 Grupo ${grupoId} - Monto mensualidad: ${montoMensualidad}`);

        // Calcular ingreso para este grupo: cantidad de alumnos × monto mensual
        const ingresoGrupo = alumnosInscritos.length * montoMensualidad;
        ingresos += ingresoGrupo;

        // Construir lista de alumnos
        const alumnos = alumnosInscritos.map(ins => ({
          idAlumno: ins.idAlumno,
          nombreAlumno: ins.nombreAlumno || 'Sin nombre',
          modalidad: ins.modalidad || 'Presencial',
        }));

        gruposConAlumnos.push({
          idGrupo: grupoId,
          nombreCurso: g.nombreCurso || 'Curso sin nombre',
          diaClase: g.diaClase || '',
          horaClase: g.horaClase || '',
          cantidadAlumnos: alumnos.length,
          montoMensualidad: montoMensualidad,
          ingresoGrupo: ingresoGrupo, // 👈 NUEVO: para depuración
          alumnos,
        });
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
        cantidadGrupos: gruposDelProf.length,
        grupos: gruposConAlumnos,
      });
    }

    console.log(`✅ Reporte generado con ${resultados.length} profesores`);
    res.json(resultados);
  } catch (error) {
    console.error("ERROR RENTABILIDAD:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// REPORTE DE PAGOS (COBRANZA) - sin cambios
// ============================================================
router.get("/pagos", async (req, res) => {
  try {
    const { mes, anio, metodo, factura } = req.query;
    const filtro = {};

    if (mes && anio) {
      const start = new Date(anio, mes - 1, 1);
      const end = new Date(anio, mes, 1);
      filtro.fechaAbono = { $gte: start, $lt: end };
    }
    if (metodo) filtro.metodoAbono = metodo;
    if (factura) filtro.facturaRequerida = factura === 'true';

    const abonos = await Abono.aggregate([
      {
        $match: {
          ...filtro,
          fechaAbono: { $type: "date" }
        }
      },
      {
        $lookup: {
          from: "pagos",
          localField: "idPago",
          foreignField: "_id",
          as: "pago"
        }
      },
      { $unwind: { path: "$pago", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "alumnos",
          localField: "pago.idAlumno",
          foreignField: "idAlumno",
          as: "alumno"
        }
      },
      { $unwind: { path: "$alumno", preserveNullAndEmptyArrays: true } },
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

    const totales = await Abono.aggregate([
      {
        $match: {
          ...filtro,
          fechaAbono: { $type: "date" }
        }
      },
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

// ============================================================
// RESUMEN DE PAGOS
// ============================================================
router.get("/pagos/resumen", async (req, res) => {
  try {
    const resumen = await Abono.aggregate([
      {
        $match: {
          fechaAbono: { $type: "date" }
        }
      },
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

// ============================================================
// RECIBO DE PAGO
// ============================================================
router.get("/pagos/:pagoId", async (req, res) => {
  try {
    const { pagoId } = req.params;
    const pago = await Pago.findById(pagoId)
      .populate('idAlumno')
      .lean();
    if (!pago) return res.status(404).json({ error: "Pago no encontrado" });

    const abonos = await Abono.find({ idPago: pagoId }).lean();
    const totalAbonado = abonos.reduce((sum, a) => sum + a.montoAbono, 0);

    res.json({ pago, abonos, totalAbonado });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;