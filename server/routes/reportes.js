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
    console.log("📊 Generando reporte de rentabilidad...");

    // 1. Obtener datos
    const profesores = await Profesor.find({ estatus: "Activo" }).lean();
    const grupos = await Grupo.find({ Estatus: "Activo" }).lean();
    const inscripciones = await Inscripcion.find({ estatus: "Activo" }).lean();

    console.log(`👨‍🏫 Profesores: ${profesores.length}`);
    console.log(`📚 Grupos: ${grupos.length}`);
    console.log(`📝 Inscripciones activas: ${inscripciones.length}`);

    // 2. Construir mapa de grupos por profesor
    const gruposPorProfesor = {};
    for (const g of grupos) {
      const idProf = g.idProfesor;
      if (!idProf) {
        console.warn(`⚠️ Grupo ${g.IdGrupo} sin profesor asignado`);
        continue;
      }
      if (!gruposPorProfesor[idProf]) gruposPorProfesor[idProf] = [];
      gruposPorProfesor[idProf].push(g);
    }

    // 3. Calcular resultados por profesor
    const resultados = [];

    for (const prof of profesores) {
      const id = prof.idProfesor;
      const gruposDelProf = gruposPorProfesor[id] || [];

      console.log(`\n👨‍🏫 Procesando profesor: ${prof.nombre} (${id})`);
      console.log(`   Grupos: ${gruposDelProf.length}`);

      // Calcular horas totales
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

      // 🔥 NUEVO CÁLCULO DE INGRESOS: basado en alumnos inscritos × costo del curso
      let ingresos = 0;
      const gruposConAlumnos = [];

      for (const g of gruposDelProf) {
        const grupoId = g.IdGrupo || g.idGrupo;
        // Obtener inscripciones activas de este grupo
        const alumnosInscritos = inscripciones.filter(ins => ins.grupoId === grupoId);
        
        // 🔥 Obtener el costo del curso (mensualidad) desde la inscripción o desde el grupo
        // Si no existe, usar un valor por defecto de $1500
        let montoMensualidad = 1500; // Valor por defecto
        
        if (alumnosInscritos.length > 0) {
          // Intentar obtener el monto de la primera inscripción
          const primeraInscripcion = alumnosInscritos[0];
          if (primeraInscripcion.montoMensualidad) {
            montoMensualidad = primeraInscripcion.montoMensualidad;
          } else if (g.montoMensualidad) {
            montoMensualidad = g.montoMensualidad;
          }
        } else if (g.montoMensualidad) {
          montoMensualidad = g.montoMensualidad;
        }

        // Sumar ingresos: cantidad de alumnos × monto mensualidad
        const ingresosGrupo = alumnosInscritos.length * montoMensualidad;
        ingresos += ingresosGrupo;

        console.log(`   Grupo ${grupoId}: ${alumnosInscritos.length} alumnos × $${montoMensualidad} = $${ingresosGrupo}`);

        // Construir lista de alumnos para el frontend
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
          alumnos,
        });
      }

      // Calcular utilidad y porcentaje
      const utilidad = ingresos - costo;
      const porcentaje = costo > 0 ? (utilidad / costo) * 100 : 0;

      console.log(`   Ingresos totales: $${ingresos}`);
      console.log(`   Costo: $${costo}`);
      console.log(`   Utilidad: $${utilidad}`);

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

    console.log("\n✅ Reporte generado exitosamente");
    res.json(resultados);
  } catch (error) {
    console.error("❌ ERROR RENTABILIDAD:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// REPORTE DE PAGOS (COBRANZA)
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