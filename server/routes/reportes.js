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
import CursoVerano from "../models/CursoVerano.js";

const router = express.Router();

const MESES_LABEL = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

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

const getRangoFechasMexico = (anio, mes) => {
  const inicio = new Date(Date.UTC(anio, mes - 1, 1, 6, 0, 0));
  const fin = new Date(Date.UTC(anio, mes, 1, 5, 59, 59, 999));
  return { inicio, fin };
};

// ============================================================
// GET /pagos - Reporte de cobranza
// ============================================================
router.get("/pagos", async (req, res) => {
  try {
    const { mes, anio } = req.query;
    let filtro = {};
    if (mes && anio) {
      const { inicio, fin } = getRangoFechasMexico(parseInt(anio), parseInt(mes));
      filtro.fechaAbono = { $gte: inicio, $lte: fin };
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
    res.json({ abonos: abonosConNombre });
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
    const mes = parseInt(req.query.mes) || (hoy.getMonth() + 1);
    const anio = parseInt(req.query.anio) || hoy.getFullYear();

    const { inicio, fin } = getRangoFechasMexico(anio, mes);
    const mesLabel = MESES_LABEL[mes - 1];

    const profesoresMap = {};

    const getProfesor = (id, nombre) => {
      if (!profesoresMap[id]) {
        profesoresMap[id] = {
          idProfesor: id,
          nombre: nombre,
          ingresosRegulares: 0,
          ingresosExtras: 0,
          costoRegular: 0,
          costoExtras: 0,
          grupos: []
        };
      }
      return profesoresMap[id];
    };

    // 1. INGRESOS REGULARES
    const abonos = await Abono.aggregate([
      { $match: { fechaAbono: { $gte: inicio, $lte: fin } } },
      { $lookup: { from: "grupos", localField: "grupoId", foreignField: "IdGrupo", as: "grupoInfo" } },
      { $unwind: { path: "$grupoInfo", preserveNullAndEmptyArrays: true } },
      { $lookup: { from: "profesores", localField: "grupoInfo.idProfesor", foreignField: "idProfesor", as: "profesorInfo" } },
      { $unwind: { path: "$profesorInfo", preserveNullAndEmptyArrays: true } },
    ]);

    for (const abono of abonos) {
      const profId = abono.profesorInfo?.idProfesor || "sin-profesor";
      const profNombre = abono.profesorInfo?.nombre || "Sin profesor";
      const prof = getProfesor(profId, profNombre);
      
      const monto = abono.montoAbono || 0;
      prof.ingresosRegulares += monto;

      const grupoId = abono.grupoId;
      let grupo = prof.grupos.find(g => g.idGrupo === grupoId);
      if (!grupo) {
        grupo = { idGrupo: grupoId, nombreCurso: abono.grupoInfo?.nombreCurso || "Sin grupo", ingresosGrupo: 0, alumnos: new Set(), tipo: 'regular' };
        prof.grupos.push(grupo);
      }
      grupo.ingresosGrupo += monto;
      if (abono.idAlumno) grupo.alumnos.add(abono.idAlumno);
    }

    // 2. COSTOS REGULARES
    // Usamos $or y $ne:false para asegurar que atrapamos todos los pagos
    const pagosProf = await PagoProfesor.find({ 
      $or: [ { fecha: { $gte: inicio, $lte: fin } }, { createdAt: { $gte: inicio, $lte: fin } } ],
      activo: { $ne: false } 
    }).lean();

    for (const pago of pagosProf) {
      const prof = getProfesor(pago.idProfesor, pago.nombreProfesor || "Sin nombre");
      prof.costoRegular += (pago.montoCalculado || 0);
    }

    // 3. CURSOS EXTRAS
    const cursosDelMes = await CursoVerano.find({ fechaInicio: { $gte: inicio, $lte: fin } }).lean();
    
    for (const curso of cursosDelMes) {
      const inscripciones = await InscripcionVerano.find({ idCursoVerano: curso.idCursoVerano }).lean();
      const ingresoCursoTotal = inscripciones.reduce((sum, ins) => sum + (ins.montoPago || 0), 0);
      const alumnosCurso = inscripciones.length;
      const asignaciones = await AsignacionProfesorVerano.find({ idCursoVerano: curso.idCursoVerano }).lean();
      
      let horasTotalesCurso = 0;
      asignaciones.forEach(asig => { horasTotalesCurso += (asig.dias.length * asig.horasPorDia * asig.semanas); });

      for (const asig of asignaciones) {
        const prof = getProfesor(asig.idProfesor, asig.nombreProfesor || "Sin nombre");
        const costoAsignacion = (asig.dias.length * asig.horasPorDia * asig.semanas) * asig.costoHora;
        prof.costoExtras += costoAsignacion;

        const horasAsignacion = (asig.dias.length * asig.horasPorDia * asig.semanas);
        const ingresoProporcional = horasTotalesCurso > 0 ? (horasAsignacion / horasTotalesCurso) * ingresoCursoTotal : 0;
        prof.ingresosExtras += ingresoProporcional;

        prof.grupos.push({
          idGrupo: curso.idCursoVerano,
          nombreCurso: curso.nombre,
          ingresosGrupo: ingresoProporcional,
          cantidadAlumnos: alumnosCurso,
          tipo: 'extra'
        });
      }
    }

    const dataFinal = Object.values(profesoresMap).map(prof => {
      const gruposFormateados = prof.grupos.map(g => ({
        idGrupo: g.idGrupo, nombreCurso: g.nombreCurso, ingresosGrupo: g.ingresosGrupo,
        cantidadAlumnos: g.alumnos ? g.alumnos.size : g.cantidadAlumnos, tipo: g.tipo
      }));

      const totalIngresos = prof.ingresosRegulares + prof.ingresosExtras;
      const totalCostos = prof.costoRegular + prof.costoExtras;
      const utilidad = totalIngresos - totalCostos;
      const porcentaje = totalIngresos > 0 ? (utilidad / totalIngresos) * 100 : 0;

      return {
        idProfesor: prof.idProfesor, nombre: prof.nombre,
        ingresos: totalIngresos, ingresosRegulares: prof.ingresosRegulares, ingresosExtras: prof.ingresosExtras,
        costo: totalCostos, costoRegular: prof.costoRegular, costoExtras: prof.costoExtras,
        utilidad, porcentaje,
        cantidadGrupos: gruposFormateados.length,
        cantidadAlumnos: gruposFormateados.reduce((sum, g) => sum + g.cantidadAlumnos, 0),
        grupos: gruposFormateados
      };
    }).filter(p => p.ingresos > 0 || p.costo > 0 || p.cantidadGrupos > 0).sort((a, b) => b.ingresos - a.ingresos);

    res.json(dataFinal);
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

    const { inicio, fin } = getRangoFechasMexico(anio, mes);
    const mesLabel = MESES_LABEL[mes - 1];

    const abonos = await Abono.find({ fechaAbono: { $gte: inicio, $lte: fin } }).lean();
    const totalIngresosRegulares = abonos.reduce((sum, a) => sum + (a.montoAbono || 0), 0);

    const cursosDelMes = await CursoVerano.find({ fechaInicio: { $gte: inicio, $lte: fin } }).lean();
    const idsCursos = cursosDelMes.map(c => c.idCursoVerano);

    const inscripcionesVerano = await InscripcionVerano.find({ idCursoVerano: { $in: idsCursos } }).lean();
    const totalIngresosVerano = inscripcionesVerano.reduce((sum, ins) => sum + (ins.montoPago || 0), 0);

    const todasInscripciones = await Inscripcion.find().lean();
    const totalIngresosProyectados = calcularProyeccionMes(todasInscripciones, inicio, fin);
    const totalIngresos = totalIngresosRegulares + totalIngresosVerano;

    // 🚨 FIX DEFINITIVO PARA GASTOS: Búsqueda doble ($or) y excluir nulos ($ne:false)
    const gastos = await Gasto.find({ 
      $or: [
        { fecha: { $gte: inicio, $lte: fin } },
        { anio: anio, mes: mesLabel }
      ],
      activo: { $ne: false }, 
      categoria: { $ne: "Profesores" } 
    }).lean();
    
    const desgloseGastosMap = {};
    let totalGastos = 0;
    gastos.forEach(g => {
      const cat = g.categoria || 'Otros';
      desgloseGastosMap[cat] = (desgloseGastosMap[cat] || 0) + (g.monto || 0);
      totalGastos += (g.monto || 0);
    });

    // FIX NÓMINA REGULAR
    const pagosProf = await PagoProfesor.find({ 
      $or: [ { fecha: { $gte: inicio, $lte: fin } }, { createdAt: { $gte: inicio, $lte: fin } } ],
      activo: { $ne: false } 
    }).lean();
    
    const desgloseProfesoresMap = {};
    let totalProfesoresRegulares = 0;
    pagosProf.forEach(p => {
      const nom = p.nombreProfesor || 'Sin nombre';
      desgloseProfesoresMap[nom] = (desgloseProfesoresMap[nom] || 0) + (p.montoCalculado || 0);
      totalProfesoresRegulares += (p.montoCalculado || 0);
    });

    const asignacionesVerano = await AsignacionProfesorVerano.find({ idCursoVerano: { $in: idsCursos } }).lean();
    let totalProfesoresVerano = 0;
    asignacionesVerano.forEach(asig => {
      totalProfesoresVerano += ((asig.dias.length * asig.horasPorDia * asig.semanas) * asig.costoHora);
    });

    const totalEgresos = totalGastos + totalProfesoresRegulares + totalProfesoresVerano;
    const utilidad = totalIngresos - totalEgresos;
    const utilidadProyectada = (totalIngresosProyectados + totalIngresosVerano) - totalEgresos;
    const porcentajeUtilidad = totalIngresos > 0 ? (utilidad / totalIngresos) * 100 : 0;

    const fuentesIngreso = [
      { id: 'regular', label: 'Mensualidades Cobradas', monto: totalIngresosRegulares },
      { id: 'extras', label: 'Cursos Extras / Eventos', monto: totalIngresosVerano }
    ].filter(f => f.monto > 0);

    const fuentesEgreso = [
      ...Object.keys(desgloseGastosMap).map(k => ({ id: `gasto-${k}`, label: `Gasto: ${k}`, monto: desgloseGastosMap[k] })),
      { id: 'nomina-regular', label: 'Nómina Regular', monto: totalProfesoresRegulares },
      { id: 'nomina-extras', label: 'Nómina Cursos Extras', monto: totalProfesoresVerano }
    ].filter(f => f.monto > 0);

    const desgloseGastos = Object.keys(desgloseGastosMap).map(k => ({ categoria: k, monto: desgloseGastosMap[k] }));
    const desgloseProfesores = Object.keys(desgloseProfesoresMap).map(k => ({ idProfesor: k, nombre: k, costo: desgloseProfesoresMap[k] }));

    res.json({
      periodo: { anio, mes, mesLabel: MESES_LABEL[mes - 1], label: `${MESES_LABEL[mes - 1]} ${anio}` },
      ingresos: { fuentes: fuentesIngreso, total: totalIngresos, proyectado: totalIngresosProyectados + totalIngresosVerano },
      egresos: { fuentes: fuentesEgreso, total: totalEgresos },
      utilidad: Math.round(utilidad * 100) / 100,
      utilidadProyectada: Math.round(utilidadProyectada * 100) / 100,
      porcentajeUtilidad: Math.round(porcentajeUtilidad * 100) / 100,
      desgloseGastos,
      desgloseProfesores,
      variacionVsMesAnterior: { monto: 0, porcentaje: 0 }
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

    const todasInscripciones = await Inscripcion.find().lean();
    const todosCursosVerano = await CursoVerano.find({ año: anio }).lean();

    for (let mes = 1; mes <= 12; mes++) {
      const { inicio, fin } = getRangoFechasMexico(anio, mes);
      const mesLabel = MESES_LABEL[mes - 1];

      const cursosDelMes = todosCursosVerano.filter(c => {
        const fInicio = new Date(c.fechaInicio);
        return fInicio >= inicio && fInicio <= fin;
      });
      const idsCursos = cursosDelMes.map(c => c.idCursoVerano);

      const abonos = await Abono.find({ fechaAbono: { $gte: inicio, $lte: fin } }).lean();
      const inscripcionesVerano = await InscripcionVerano.find({ idCursoVerano: { $in: idsCursos } }).lean();
      
      const ingresosRegulares = abonos.reduce((sum, a) => sum + (a.montoAbono || 0), 0);
      const ingresosVerano = inscripcionesVerano.reduce((sum, ins) => sum + (ins.montoPago || 0), 0);
      const ingresos = ingresosRegulares + ingresosVerano;
      const ingresosProyectados = calcularProyeccionMes(todasInscripciones, inicio, fin) + ingresosVerano;

      // FIX GASTOS
      const gastos = await Gasto.find({ 
        $or: [ { fecha: { $gte: inicio, $lte: fin } }, { anio, mes: mesLabel } ],
        activo: { $ne: false }, 
        categoria: { $ne: "Profesores" } 
      }).lean();
      
      // FIX NÓMINA
      const pagosProf = await PagoProfesor.find({ 
        $or: [ { fecha: { $gte: inicio, $lte: fin } }, { createdAt: { $gte: inicio, $lte: fin } } ],
        activo: { $ne: false } 
      }).lean();
      
      const asignacionesVerano = await AsignacionProfesorVerano.find({ idCursoVerano: { $in: idsCursos } }).lean();

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
        mesNum: mes, mesLabel: MESES_LABEL[mes - 1], label: `${MESES_LABEL[mes - 1]} ${anio}`,
        ingresos: Math.round(ingresos * 100) / 100, ingresosProyectados: Math.round(ingresosProyectados * 100) / 100,
        gastos: Math.round(gastosMonto * 100) / 100, costoProfesores: Math.round((costoProfesoresRegulares + costoProfesoresVerano) * 100) / 100,
        egresos: Math.round(egresos * 100) / 100, utilidad: Math.round(utilidad * 100) / 100,
        utilidadProyectada: Math.round(utilidadProyectada * 100) / 100, porcentajeUtilidad: Math.round(porcentajeUtilidad * 100) / 100,
      });
    }

    res.json({ anio, meses });
  } catch (error) {
    console.error("❌ Error en GET /reportes/utilidad-mensual:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;