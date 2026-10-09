import express from "express";
import Abono from "../models/Abono.js";
import Pago from "../models/Pago.js";
import Grupo from "../models/Grupo.js";
import Profesor from "../models/Profesor.js";
import Alumno from "../models/Alumno.js";
import Inscripcion from "../models/Inscripcion.js";
import Gasto from "../models/Gasto.js";
import PagoProfesor from "../models/PagoProfesor.js";
import { rangoMes, redondear } from "../utils/periodos.js";

const router = express.Router();

// ============================================================
// GET /pagos - Reporte de cobranza (SIN CAMBIOS)
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
// GET /rentabilidad-profesores - (SIN CAMBIOS)
// ============================================================
router.get("/rentabilidad-profesores", async (req, res) => {
  try {
    const hoy = new Date();
    const mes = req.query.mes || (hoy.getMonth() + 1).toString();
    const anio = req.query.anio || hoy.getFullYear().toString();

    console.log(`📊 Reporte rentabilidad - Mes: ${mes}, Año: ${anio}`);

    const mesNum = parseInt(mes);
    const anioNum = parseInt(anio);

    const fechaInicio = new Date(anioNum, mesNum - 1, 1);
    const fechaFin = new Date(anioNum, mesNum, 1);

    console.log(`📅 Filtro de fechas: ${fechaInicio} a ${fechaFin}`);

    const filtroAbonos = {
      fechaAbono: { $gte: fechaInicio, $lt: fechaFin },
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
        abonos: profIngresos.abonos || [],
        pagos: profCostos.pagos || [],
      };
    });

    const profesoresFiltrados = profesoresData.filter(
      (prof) => prof.ingresos > 0 || prof.costo > 0 || prof.cantidadGrupos > 0
    );

    profesoresFiltrados.sort((a, b) => b.ingresos - a.ingresos);

    console.log(`📊 Profesores en respuesta: ${profesoresFiltrados.length}`);

    res.json(profesoresFiltrados);
  } catch (error) {
    console.error("❌ Error en GET /reportes/rentabilidad-profesores:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// GET /rentabilidad-global — NUEVO
// Ingresos (abonos) − Gastos operativos − Nómina profesores
// ============================================================
router.get("/rentabilidad-global", async (req, res) => {
  try {
    const hoy = new Date();
    const anio = parseInt(req.query.anio) || hoy.getFullYear();
    const mes = parseInt(req.query.mes) || hoy.getMonth() + 1;

    if (mes < 1 || mes > 12) {
      return res.status(400).json({ error: "Mes inválido (1-12)" });
    }

    const { fechaInicio, fechaFin, mesLabel, label } = rangoMes(anio, mes);

    // ---- Ingresos: SOLO abonos (fuente de verdad de dinero cobrado) ----
    const ingresosAgg = await Abono.aggregate([
      { $match: { fechaAbono: { $gte: fechaInicio, $lt: fechaFin } } },
      { $group: { _id: null, total: { $sum: "$montoAbono" } } },
    ]);
    const totalAbonos = ingresosAgg[0]?.total || 0;

    // ---- Egresos: gastos operativos (excluye categoría "Profesores") ----
    const gastosAgg = await Gasto.aggregate([
      {
        $match: {
          fecha: { $gte: fechaInicio, $lt: fechaFin },
          activo: { $ne: false },
          categoria: { $ne: "Profesores" },
        },
      },
      { $group: { _id: "$categoria", monto: { $sum: "$monto" } } },
      { $sort: { monto: -1 } },
    ]);
    const totalGastos = gastosAgg.reduce((s, g) => s + (g.monto || 0), 0);

    // ---- Egresos: nómina profesores ----
    const nominaAgg = await PagoProfesor.aggregate([
      {
        $match: {
          fecha: { $gte: fechaInicio, $lt: fechaFin },
          activo: true,
        },
      },
      {
        $group: {
          _id: "$idProfesor",
          nombre: { $first: "$nombreProfesor" },
          monto: { $sum: "$montoCalculado" },
        },
      },
      { $sort: { monto: -1 } },
    ]);
    const totalNomina = nominaAgg.reduce((s, p) => s + (p.monto || 0), 0);

    const totalEgresos = totalGastos + totalNomina;
    const utilidad = totalAbonos - totalEgresos;
    const porcentajeUtilidad = totalAbonos > 0 ? (utilidad / totalAbonos) * 100 : 0;

    // ---- Variación vs mes anterior ----
    const anioAnt = mes === 1 ? anio - 1 : anio;
    const mesAnt = mes === 1 ? 12 : mes - 1;
    const rangoAnt = rangoMes(anioAnt, mesAnt);

    const [abonosAntAgg, gastosAntAgg, nominaAntAgg] = await Promise.all([
      Abono.aggregate([
        { $match: { fechaAbono: { $gte: rangoAnt.fechaInicio, $lt: rangoAnt.fechaFin } } },
        { $group: { _id: null, total: { $sum: "$montoAbono" } } },
      ]),
      Gasto.aggregate([
        {
          $match: {
            fecha: { $gte: rangoAnt.fechaInicio, $lt: rangoAnt.fechaFin },
            activo: { $ne: false },
            categoria: { $ne: "Profesores" },
          },
        },
        { $group: { _id: null, total: { $sum: "$monto" } } },
      ]),
      PagoProfesor.aggregate([
        { $match: { fecha: { $gte: rangoAnt.fechaInicio, $lt: rangoAnt.fechaFin }, activo: true } },
        { $group: { _id: null, total: { $sum: "$montoCalculado" } } },
      ]),
    ]);

    const utilidadAnterior =
      (abonosAntAgg[0]?.total || 0) -
      (gastosAntAgg[0]?.total || 0) -
      (nominaAntAgg[0]?.total || 0);

    const variacionMonto = utilidad - utilidadAnterior;
    const variacionPorcentaje =
      utilidadAnterior !== 0
        ? (variacionMonto / Math.abs(utilidadAnterior)) * 100
        : null;

    res.json({
      periodo: { anio, mes, mesLabel, label },
      ingresos: {
        fuentes: [{ id: "abonos", label: "Cobrado (abonos)", monto: redondear(totalAbonos) }],
        total: redondear(totalAbonos),
      },
      egresos: {
        fuentes: [
          { id: "gastos_operativos", label: "Gastos operativos", monto: redondear(totalGastos) },
          { id: "nomina_profesores", label: "Nómina profesores", monto: redondear(totalNomina) },
        ],
        total: redondear(totalEgresos),
      },
      utilidad: redondear(utilidad),
      porcentajeUtilidad: redondear(porcentajeUtilidad),
      desgloseGastos: gastosAgg.map((g) => ({
        categoria: g._id,
        monto: redondear(g.monto),
      })),
      desgloseProfesores: nominaAgg.map((p) => ({
        idProfesor: p._id,
        nombre: p.nombre || "Sin nombre",
        costo: redondear(p.monto),
      })),
      variacionVsMesAnterior: {
        monto: redondear(variacionMonto),
        porcentaje: variacionPorcentaje !== null ? redondear(variacionPorcentaje) : null,
      },
    });
  } catch (error) {
    console.error("❌ Error en GET /reportes/rentabilidad-global:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// GET /utilidad-mensual — NUEVO
// Serie de 12 meses del año solicitado.
// ============================================================
router.get("/utilidad-mensual", async (req, res) => {
  try {
    const hoy = new Date();
    const anio = parseInt(req.query.anio) || hoy.getFullYear();
    const inicio = new Date(anio, 0, 1);
    const fin = new Date(anio + 1, 0, 1);

    const [abonosPorMes, gastosPorMes, nominaPorMes] = await Promise.all([
      Abono.aggregate([
        { $match: { fechaAbono: { $gte: inicio, $lt: fin } } },
        { $group: { _id: { $month: "$fechaAbono" }, total: { $sum: "$montoAbono" } } },
      ]),
      Gasto.aggregate([
        {
          $match: {
            fecha: { $gte: inicio, $lt: fin },
            activo: { $ne: false },
            categoria: { $ne: "Profesores" },
          },
        },
        { $group: { _id: { $month: "$fecha" }, total: { $sum: "$monto" } } },
      ]),
      PagoProfesor.aggregate([
        { $match: { fecha: { $gte: inicio, $lt: fin }, activo: true } },
        { $group: { _id: { $month: "$fecha" }, total: { $sum: "$montoCalculado" } } },
      ]),
    ]);

    const abonosMap = Object.fromEntries(abonosPorMes.map((x) => [x._id, x.total]));
    const gastosMap = Object.fromEntries(gastosPorMes.map((x) => [x._id, x.total]));
    const nominaMap = Object.fromEntries(nominaPorMes.map((x) => [x._id, x.total]));

    const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

    const meses = Array.from({ length: 12 }, (_, i) => {
      const mesNum = i + 1;
      const abonos = abonosMap[mesNum] || 0;
      const gastos = gastosMap[mesNum] || 0;
      const nomina = nominaMap[mesNum] || 0;
      const utilidad = abonos - gastos - nomina;
      return {
        mesNum,
        mesLabel: MESES[i],
        label: `${MESES[i]} ${anio}`,
        ingresos: redondear(abonos),
        gastos: redondear(gastos),
        costoProfesores: redondear(nomina),
        egresos: redondear(gastos + nomina),
        utilidad: redondear(utilidad),
        porcentajeUtilidad: abonos > 0 ? redondear((utilidad / abonos) * 100) : 0,
      };
    });

    res.json({ anio, meses });
  } catch (error) {
    console.error("❌ Error en GET /reportes/utilidad-mensual:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;