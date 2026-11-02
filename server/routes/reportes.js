import express from "express";
import Abono from "../models/Abono.js";
import Pago from "../models/Pago.js";
import Grupo from "../models/Grupo.js";
import Profesor from "../models/Profesor.js";
import Alumno from "../models/Alumno.js";
import Inscripcion from "../models/Inscripcion.js";
import Gasto from "../models/Gasto.js";
import PagoProfesor from "../models/PagoProfesor.js";
import InscripcionVerano from "../models/InscripcionVerano.js";
import AsignacionProfesorVerano from "../models/AsignacionProfesorVerano.js";

const router = express.Router();

const MESES_LABEL = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

// Helper para calcular proyecciones de un mes
const calcularProyeccionMes = (inscripciones, fechaInicioMes, fechaFinMes) => {
  return inscripciones.reduce((sum, ins) => {
    const inicioPago = new Date(ins.fechaInicioPago);
    if (inicioPago > fechaFinMes) return sum;
    
    if (ins.fechaBaja && new Date(ins.fechaBaja) < fechaInicioMes) return sum;
    if (ins.fechaFin && new Date(ins.fechaFin) < fechaInicioMes) return sum;
    if (ins.estatus === 'Baja') return sum;

    return sum + (ins.montoMensualidad || 0);
  }, 0);
};

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
      abonoId: abono.abonoId || "",
      fecha: abono.fechaAbono || abono.createdAt,
      estudiante: abono.nombreAlumno || "Alumno desconocido",
      monto: abono.montoAbono || 0,
      metodoPago: abono.metodoAbono || "Efectivo",
      concepto: "Abono",
      factura: false,
      recibidoPor: abono.recibidoPor || "Sistema",
      saldoAFavor: abono.saldoAFavor || 0,
      observaciones: abono.notas || abono.observaciones || "",
      periodoFacturacion: abono.periodoFacturacion || "",
      estatus: abono.estatus || "",
      notas: abono.notas || "",
      grupoId: abono.grupoId || "",
      pagoId: abono.pagoId || "",
    }));

    const totales = await Abono.aggregate([
      { $match: filtro },
      {
        $group: {
          _id: { mes: { $month: "$fechaAbono" }, anio: { $year: "$fechaAbono" } },
          total: { $sum: "$montoAbono" },
          cantidad: { $sum: 1 },
        },
      },
      { $sort: { "_id.anio": -1, "_id.mes": -1 } },
    ]);

    res.json({ abonos: abonosConNombre, totales });
  } catch (error) {
    console.error("❌ Error en GET /reportes/pagos:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// GET /rentabilidad-profesores
// ============================================================
router.get("/rentabilidad-profesores", async (req, res) => {
  try {
    const hoy = new Date();
    const mes = req.query.mes || (hoy.getMonth() + 1).toString();
    const anio = req.query.anio || hoy.getFullYear().toString();

    const mesNum = parseInt(mes);
    const anioNum = parseInt(anio);

    const fechaInicio = new Date(anioNum, mesNum - 1, 1);
    const fechaFin = new Date(anioNum, mesNum, 1);

    const filtroAbonos = { fechaAbono: { $gte: fechaInicio, $lt: fechaFin } };

    const abonos = await Abono.aggregate([
      { $match: filtroAbonos },
      { $lookup: { from: "grupos", localField: "grupoId", foreignField: "IdGrupo", as: "grupoInfo" } },
      { $unwind: { path: "$grupoInfo", preserveNullAndEmptyArrays: true } },
      { $lookup: { from: "profesores", localField: "grupoInfo.idProfesor", foreignField: "idProfesor", as: "profesorInfo" } },
      { $unwind: { path: "$profesorInfo", preserveNullAndEmptyArrays: true } },
    ]);

    const ingresosPorProfesor = {};
    for (const abono of abonos) {
      const profesorId = abono.profesorInfo?.idProfesor || "sin-profesor";
      const profesorNombre = abono.profesorInfo?.nombre || "Sin profesor";
      const grupoId = abono.grupoId;
      const grupoNombre = abono.grupoInfo?.nombreCurso || "Sin grupo";
      const monto = abono.montoAbono || 0;

      if (!ingresosPorProfesor[profesorId]) {
        ingresosPorProfesor[profesorId] = { idProfesor: profesorId, nombre: profesorNombre, ingresos: 0, grupos: {} };
      }
      if (!ingresosPorProfesor[profesorId].grupos[grupoId]) {
        ingresosPorProfesor[profesorId].grupos[grupoId] = { idGrupo: grupoId, nombreCurso: grupoNombre, ingresosGrupo: 0, alumnos: new Set() };
      }

      ingresosPorProfesor[profesorId].ingresos += monto;
      ingresosPorProfesor[profesorId].grupos[grupoId].ingresosGrupo += monto;
      if (abono.idAlumno) ingresosPorProfesor[profesorId].grupos[grupoId].alumnos.add(abono.idAlumno);
    }

    const filtroPagosProf = { fecha: { $gte: fechaInicio, $lt: fechaFin }, activo: true };
    const pagosProfesores = await PagoProfesor.aggregate([
      { $match: filtroPagosProf },
      { $lookup: { from: "profesores", localField: "idProfesor", foreignField: "idProfesor", as: "profesorInfo" } },
      { $unwind: { path: "$profesorInfo", preserveNullAndEmptyArrays: true } },
    ]);

    const costosPorProfesor = {};
    for (const pago of pagosProfesores) {
      const profesorId = pago.profesorInfo?.idProfesor || pago.idProfesor || "sin-profesor";
      const profesorNombre = pago.profesorInfo?.nombre || pago.nombreProfesor || "Sin profesor";
      if (!costosPorProfesor[profesorId]) {
        costosPorProfesor[profesorId] = { idProfesor: profesorId, nombre: profesorNombre, costoTotal: 0 };
      }
      costosPorProfesor[profesorId].costoTotal += pago.montoCalculado || 0;
    }

    const todosLosProfesores = new Set([...Object.keys(ingresosPorProfesor), ...Object.keys(costosPorProfesor)]);
    
    const profesoresData = Array.from(todosLosProfesores).map((profesorId) => {
      const profIngresos = ingresosPorProfesor[profesorId] || { idProfesor: profesorId, nombre: "Sin profesor", ingresos: 0, grupos: {} };
      const profCostos = costosPorProfesor[profesorId] || { idProfesor: profesorId, nombre: "Sin profesor", costoTotal: 0 };
      
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
        nombre,
        ingresos: Math.round(ingresos * 100) / 100,
        costo: Math.round(costo * 100) / 100,
        utilidad: Math.round(utilidad * 100) / 100,
        porcentaje: Math.round(porcentaje * 100) / 100,
        cantidadGrupos: gruposData.length,
        cantidadAlumnos: gruposData.reduce((sum, g) => sum + g.cantidadAlumnos, 0),
        grupos: gruposData,
      };
    });

    const profesoresFiltrados = profesoresData
      .filter((prof) => prof.ingresos > 0 || prof.costo > 0 || prof.cantidadGrupos > 0)
      .sort((a, b) => b.ingresos - a.ingresos);

    res.json(profesoresFiltrados);
  } catch (error) {
    console.error("❌ Error en GET /reportes/rentabilidad-profesores:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// GET /rentabilidad-global
// ============================================================
router.get("/rentabilidad-global", async (req, res) => {
  try {
    const hoy = new Date();
    const mes = parseInt(req.query.mes) || (hoy.getMonth() + 1);
    const anio = parseInt(req.query.anio) || hoy.getFullYear();

    const fechaInicio = new Date(anio, mes - 1, 1);
    const fechaFin = new Date(anio, mes, 1);
    const fechaFinMes = new Date(anio, mes, 0, 23, 59, 59);

    // 1. INGRESOS REGULARES (Abonos reales)
    const abonos = await Abono.find({ fechaAbono: { $gte: fechaInicio, $lt: fechaFin } }).lean();
    const totalIngresosRegulares = abonos.reduce((sum, a) => sum + (a.montoAbono || 0), 0);

    // 2. INGRESOS DE VERANO
    const inscripcionesVerano = await InscripcionVerano.find({ createdAt: { $gte: fechaInicio, $lt: fechaFin } }).lean();
    const totalIngresosVerano = inscripcionesVerano.reduce((sum, ins) => sum + (ins.montoPago || 0), 0);

    // 3. PROYECCIÓN DE INGRESOS (Regular)
    const todasInscripciones = await Inscripcion.find().lean();
    const totalIngresosProyectados = calcularProyeccionMes(todasInscripciones, fechaInicio, fechaFinMes);

    const totalIngresos = totalIngresosRegulares + totalIngresosVerano;

    // 4. GASTOS OPERATIVOS
    const gastos = await Gasto.find({ fecha: { $gte: fechaInicio, $lt: fechaFin }, activo: true, categoria: { $ne: "Profesores" } }).lean();
    const desgloseGastosMap = {};
    let totalGastos = 0;
    gastos.forEach(g => {
      const cat = g.categoria || 'Otros';
      desgloseGastosMap[cat] = (desgloseGastosMap[cat] || 0) + (g.monto || 0);
      totalGastos += (g.monto || 0);
    });

    // 5. COSTO PROFESORES REGULARES
    const pagosProf = await PagoProfesor.find({ fecha: { $gte: fechaInicio, $lt: fechaFin }, activo: true }).lean();
    const desgloseProfesoresMap = {};
    let totalProfesoresRegulares = 0;
    pagosProf.forEach(p => {
      const nom = p.nombreProfesor || 'Sin nombre';
      desgloseProfesoresMap[nom] = (desgloseProfesoresMap[nom] || 0) + (p.montoCalculado || 0);
      totalProfesoresRegulares += (p.montoCalculado || 0);
    });

    // 6. COSTO PROFESORES VERANO
    const asignacionesVerano = await AsignacionProfesorVerano.find({ createdAt: { $gte: fechaInicio, $lt: fechaFin } }).lean();
    let totalProfesoresVerano = 0;
    asignacionesVerano.forEach(asig => {
      totalProfesoresVerano += ((asig.dias.length * asig.horasPorDia * asig.semanas) * asig.costoHora);
    });

    const totalEgresos = totalGastos + totalProfesoresRegulares + totalProfesoresVerano;
    const utilidad = totalIngresos - totalEgresos;
    const utilidadProyectada = (totalIngresosProyectados + totalIngresosVerano) - totalEgresos; // Proyectamos verano como ya cobrado
    const porcentajeUtilidad = totalIngresos > 0 ? (utilidad / totalIngresos) * 100 : 0;

    // Formatear fuentes
    const fuentesIngreso = [
      { id: 'regular', label: 'Mensualidades Cobradas', monto: totalIngresosRegulares },
      { id: 'verano', label: 'Cursos de Verano Cobrados', monto: totalIngresosVerano }
    ].filter(f => f.monto > 0);

    const fuentesEgreso = [
      ...Object.keys(desgloseGastosMap).map(k => ({ id: `gasto-${k}`, label: `Gasto: ${k}`, monto: desgloseGastosMap[k] })),
      { id: 'nomina-regular', label: 'Nómina Regular', monto: totalProfesoresRegulares },
      { id: 'nomina-verano', label: 'Nómina Verano', monto: totalProfesoresVerano }
    ].filter(f => f.monto > 0);

    const desgloseGastos = Object.keys(desgloseGastosMap).map(k => ({ categoria: k, monto: desgloseGastosMap[k] }));
    const desgloseProfesores = Object.keys(desgloseProfesoresMap).map(k => ({ idProfesor: k, nombre: k, costo: desgloseProfesoresMap[k] }));

    // Variación (Simulada por brevedad)
    const variacionMonto = 0; 
    const variacionPorcentaje = 0;

    res.json({
      periodo: { anio, mes, mesLabel: MESES_LABEL[mes - 1], label: `${MESES_LABEL[mes - 1]} ${anio}` },
      ingresos: { 
        fuentes: fuentesIngreso, 
        total: totalIngresos, 
        proyectado: totalIngresosProyectados + totalIngresosVerano 
      },
      egresos: { fuentes: fuentesEgreso, total: totalEgresos },
      utilidad: Math.round(utilidad * 100) / 100,
      utilidadProyectada: Math.round(utilidadProyectada * 100) / 100,
      porcentajeUtilidad: Math.round(porcentajeUtilidad * 100) / 100,
      desgloseGastos,
      desgloseProfesores,
      variacionVsMesAnterior: { monto: variacionMonto, porcentaje: variacionPorcentaje }
    });
  } catch (error) {
    console.error("❌ Error en GET /reportes/rentabilidad-global:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// GET /utilidad-mensual
// ============================================================
router.get("/utilidad-mensual", async (req, res) => {
  try {
    const anio = parseInt(req.query.anio) || new Date().getFullYear();
    const meses = [];

    // Optimización: Traemos todas las inscripciones una sola vez
    const todasInscripciones = await Inscripcion.find().lean();

    for (let mes = 1; mes <= 12; mes++) {
      const fechaInicio = new Date(anio, mes - 1, 1);
      const fechaFin = new Date(anio, mes, 1);
      const fechaFinMes = new Date(anio, mes, 0, 23, 59, 59);

      // Ingresos
      const abonos = await Abono.find({ fechaAbono: { $gte: fechaInicio, $lt: fechaFin } }).lean();
      const inscripcionesVerano = await InscripcionVerano.find({ createdAt: { $gte: fechaInicio, $lt: fechaFin } }).lean();
      
      const ingresosRegulares = abonos.reduce((sum, a) => sum + (a.montoAbono || 0), 0);
      const ingresosVerano = inscripcionesVerano.reduce((sum, ins) => sum + (ins.montoPago || 0), 0);
      const ingresos = ingresosRegulares + ingresosVerano;
      const ingresosProyectados = calcularProyeccionMes(todasInscripciones, fechaInicio, fechaFinMes) + ingresosVerano;

      // Egresos
      const gastos = await Gasto.find({ fecha: { $gte: fechaInicio, $lt: fechaFin }, activo: true, categoria: { $ne: "Profesores" } }).lean();
      const pagosProf = await PagoProfesor.find({ fecha: { $gte: fechaInicio, $lt: fechaFin }, activo: true }).lean();
      const asignacionesVerano = await AsignacionProfesorVerano.find({ createdAt: { $gte: fechaInicio, $lt: fechaFin } }).lean();

      const gastosMonto = gastos.reduce((sum, g) => sum + (g.monto || 0), 0);
      const costoProfesoresRegulares = pagosProf.reduce((sum, p) => sum + (p.montoCalculado || 0), 0);
      const costoProfesoresVerano = asignacionesVerano.reduce((sum, asig) => {
        return sum + ((asig.dias.length * asig.horasPorDia * asig.semanas) * asig.costoHora);
      }, 0);

      const egresos = gastosMonto + costoProfesoresRegulares + costoProfesoresVerano;
      const utilidad = ingresos - egresos;
      const utilidadProyectada = ingresosProyectados - egresos;
      const porcentajeUtilidad = ingresos > 0 ? (utilidad / ingresos) * 100 : 0;

      meses.push({
        mesNum: mes,
        mesLabel: MESES_LABEL[mes - 1],
        label: `${MESES_LABEL[mes - 1]} ${anio}`,
        ingresos: Math.round(ingresos * 100) / 100,
        ingresosProyectados: Math.round(ingresosProyectados * 100) / 100,
        gastos: Math.round(gastosMonto * 100) / 100,
        costoProfesores: Math.round((costoProfesoresRegulares + costoProfesoresVerano) * 100) / 100,
        egresos: Math.round(egresos * 100) / 100,
        utilidad: Math.round(utilidad * 100) / 100,
        utilidadProyectada: Math.round(utilidadProyectada * 100) / 100,
        porcentajeUtilidad: Math.round(porcentajeUtilidad * 100) / 100,
      });
    }

    res.json({ anio, meses });
  } catch (error) {
    console.error("❌ Error en GET /reportes/utilidad-mensual:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;