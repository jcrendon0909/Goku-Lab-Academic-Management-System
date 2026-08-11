import express from "express";
import Abono from "../models/Abono.js";
import Pago from "../models/Pago.js";
import Grupo from "../models/Grupo.js";
import Profesor from "../models/Profesor.js";
import Alumno from "../models/Alumno.js";
import Inscripcion from "../models/Inscripcion.js";
import Gasto from "../models/Gasto.js";
import PagoProfesor from "../models/PagoProfesor.js";

const router = express.Router();

// ============================================================
// GET /pagos - Reporte de cobranza
// ============================================================
router.get("/pagos", async (req, res) => {
  try {
    const { mes, anio } = req.query;

    const filtro = {};
    if (mes && anio) {
      const fechaInicio = new Date(anio, mes - 1, 1);
      const fechaFin = new Date(anio, mes, 0, 23, 59, 59);
      filtro.fechaAbono = { $gte: fechaInicio, $lte: fechaFin };
    }

    const abonos = await Abono.find(filtro).lean();

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
      grupoId: abono.grupoId || "",
    }));

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
// GET /rentabilidad-profesores - Reporte de rentabilidad (CORREGIDO)
// ============================================================
router.get("/rentabilidad-profesores", async (req, res) => {
  try {
    // Usar mes y año actual por defecto
    const hoy = new Date();
    const mes = req.query.mes || (hoy.getMonth() + 1).toString();
    const anio = req.query.anio || hoy.getFullYear().toString();

    console.log(`📊 Reporte rentabilidad - Mes: ${mes}, Año: ${anio}`);

    const mesNum = parseInt(mes);
    const anioNum = parseInt(anio);

    // Fechas exactas para el filtro
    const fechaInicio = new Date(anioNum, mesNum - 1, 1);
    const fechaFin = new Date(anioNum, mesNum, 1);

    console.log(`📅 Filtro de fechas: ${fechaInicio} a ${fechaFin}`);

    // ============================================================
    // 1. INGRESOS: Abonos del mes, con lookup a grupos y profesores
    // ============================================================
    const filtroAbonos = {
      fechaAbono: { $gte: fechaInicio, $lt: fechaFin }
    };

    const abonos = await Abono.aggregate([
      { $match: filtroAbonos },
      {
        $lookup: {
          from: "grupos",
          localField: "grupoId",
          foreignField: "IdGrupo",
          as: "grupoInfo",
        },
      },
      { $unwind: { path: "$grupoInfo", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "profesores",
          localField: "grupoInfo.idProfesor",
          foreignField: "idProfesor",
          as: "profesorInfo",
        },
      },
      { $unwind: { path: "$profesorInfo", preserveNullAndEmptyArrays: true } },
    ]);

    console.log(`📊 Abonos del mes: ${abonos.length}`);

    // Agrupar ingresos por profesor
    const ingresosPorProfesor = {};
    for (const abono of abonos) {
      const profesorId = abono.profesorInfo?.idProfesor || "sin-profesor";
      const profesorNombre = abono.profesorInfo?.nombre || "Sin profesor";
      const grupoId = abono.grupoId;
      const grupoNombre = abono.grupoInfo?.nombreCurso || "Sin grupo";
      const monto = abono.montoAbono || 0;
      const idAlumno = abono.idAlumno;

      if (!ingresosPorProfesor[profesorId]) {
        ingresosPorProfesor[profesorId] = {
          idProfesor: profesorId,
          nombre: profesorNombre,
          ingresos: 0,
          grupos: {},
        };
      }

      if (!ingresosPorProfesor[profesorId].grupos[grupoId]) {
        ingresosPorProfesor[profesorId].grupos[grupoId] = {
          idGrupo: grupoId,
          nombreCurso: grupoNombre,
          ingresosGrupo: 0,
          alumnos: new Set(),
        };
      }

      ingresosPorProfesor[profesorId].ingresos += monto;
      ingresosPorProfesor[profesorId].grupos[grupoId].ingresosGrupo += monto;
      if (idAlumno) {
        ingresosPorProfesor[profesorId].grupos[grupoId].alumnos.add(idAlumno);
      }
    }

    // ============================================================
    // 2. COSTOS: Pagos a profesores del mes, con lookup a profesores
    // ============================================================
    const filtroPagosProf = {
      fecha: { $gte: fechaInicio, $lt: fechaFin },
      activo: true,
    };

    const pagosProfesores = await PagoProfesor.aggregate([
      { $match: filtroPagosProf },
      {
        $lookup: {
          from: "profesores",
          localField: "idProfesor",
          foreignField: "idProfesor",
          as: "profesorInfo",
        },
      },
      { $unwind: { path: "$profesorInfo", preserveNullAndEmptyArrays: true } },
    ]);

    console.log(`💰 Pagos activos a profesores en el mes: ${pagosProfesores.length}`);

    // Agrupar costos por profesor (usando el nombre de la colección profesores)
    const costosPorProfesor = {};
    for (const pago of pagosProfesores) {
      const profesorId = pago.profesorInfo?.idProfesor || pago.idProfesor || "sin-profesor";
      const profesorNombre = pago.profesorInfo?.nombre || pago.nombreProfesor || "Sin profesor";

      if (!costosPorProfesor[profesorId]) {
        costosPorProfesor[profesorId] = {
          idProfesor: profesorId,
          nombre: profesorNombre,
          costoTotal: 0,
          pagos: [],
        };
      }
      costosPorProfesor[profesorId].costoTotal += pago.montoCalculado || 0;
      costosPorProfesor[profesorId].pagos.push(pago);
    }

    // ============================================================
    // 3. COMBINAR TODOS LOS PROFESORES (ingresos + costos)
    // ============================================================
    const todosLosProfesores = new Set([
      ...Object.keys(ingresosPorProfesor),
      ...Object.keys(costosPorProfesor),
    ]);

    console.log(`👨‍🏫 Profesores encontrados: ${todosLosProfesores.size}`);

    const profesoresData = Array.from(todosLosProfesores).map((profesorId) => {
      const profIngresos = ingresosPorProfesor[profesorId] || {
        idProfesor: profesorId,
        nombre: "Sin profesor",
        ingresos: 0,
        grupos: {},
      };
      const profCostos = costosPorProfesor[profesorId] || {
        idProfesor: profesorId,
        nombre: "Sin profesor",
        costoTotal: 0,
        pagos: [],
      };

      // Priorizar el nombre de ingresos (que viene del profesor real) sobre el de costos
      const nombre = profIngresos.nombre !== "Sin profesor" ? profIngresos.nombre : profCostos.nombre;

      const ingresos = profIngresos.ingresos;
      const costo = profCostos.costoTotal;
      const utilidad = ingresos - costo;
      const porcentaje = ingresos > 0 ? (utilidad / ingresos) * 100 : 0;

      const gruposData = Object.values(profIngresos.grupos).map((g) => ({
        idGrupo: g.idGrupo,
        nombreCurso: g.nombreCurso,
        ingresosGrupo: g.ingresosGrupo,
        cantidadAlumnos: g.alumnos.size,
      }));

      return {
        idProfesor: profesorId,
        nombre: nombre,
        ingresos: Math.round(ingresos * 100) / 100,
        costo: Math.round(costo * 100) / 100,
        utilidad: Math.round(utilidad * 100) / 100,
        porcentaje: Math.round(porcentaje * 100) / 100,
        cantidadGrupos: gruposData.length,
        cantidadAlumnos: gruposData.reduce((sum, g) => sum + g.cantidadAlumnos, 0),
        grupos: gruposData,
        // Para depuración (opcional)
        abonos: profIngresos.abonos || [],
        pagos: profCostos.pagos || [],
      };
    });

    // 🔥 FILTRO FINAL: Solo mostrar profesores con actividad (ingresos > 0 o costos > 0)
    const profesoresFiltrados = profesoresData.filter(prof => 
      prof.ingresos > 0 || prof.costo > 0 || prof.cantidadGrupos > 0
    );

    // Ordenar por ingresos (mayor a menor)
    profesoresFiltrados.sort((a, b) => b.ingresos - a.ingresos);

    console.log(`📊 Profesores en respuesta: ${profesoresFiltrados.length}`);

    res.json(profesoresFiltrados);

  } catch (error) {
    console.error("❌ Error en GET /reportes/rentabilidad-profesores:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;