import express from "express";
import Abono from "../models/Abono.js";
import Pago from "../models/Pago.js";
import Inscripcion from "../models/Inscripcion.js";
import Alumno from "../models/Alumno.js";
import { generarId } from "../utils/generarId.js";
import { crearPagoId } from "../utils/pagos.js";
import cache from "../utils/cache.js";

const router = express.Router();

// Helper: normaliza "YYYY-MM-DD" a mediodía local (evita drift de TZ)
function parseFechaAbono(raw) {
  if (!raw) return new Date();
  const [y, m, d] = String(raw).split('-').map(Number);
  if (!y || !m || !d) return new Date(raw);
  return new Date(y, m - 1, d, 12, 0, 0);
}

// ============================================================
// Helper: recalcular Pago basado en sus abonos
// ============================================================
async function recalcularPagoDesdeAbonos(pagoId) {
  const pago = await Pago.findOne({ pagoId });
  if (!pago) return { ok: false, reason: 'Pago no encontrado' };

  if (pago.tipoPago === 'adelantado') {
    return {
      ok: true,
      skipped: true,
      reason: 'Es un anticipo, no se recalcula automáticamente',
    };
  }

  const abonos = await Abono.find({ pagoId }).lean();
  const tieneAbonos = abonos.length > 0;
  const totalAbonado = abonos.reduce((s, a) => s + (a.montoAbono || 0), 0);

  let nuevoEstatus;
  let nuevaFechaPago = null;

  if (!tieneAbonos) {
    nuevoEstatus = 'Pendiente';
  } else if (totalAbonado >= pago.montoPago) {
    nuevoEstatus = 'Pagado';
    const ultimo = abonos.sort(
      (a, b) => new Date(b.fechaAbono).getTime() - new Date(a.fechaAbono).getTime()
    )[0];
    nuevaFechaPago = ultimo.fechaAbono;
  } else if (totalAbonado > 0) {
    nuevoEstatus = 'Parcial';
  } else {
    nuevoEstatus = 'Pagado';
    nuevaFechaPago = abonos[0].fechaAbono;
  }

  pago.estatus = nuevoEstatus;
  pago.fechaPago = nuevaFechaPago;
  await pago.save();

  return {
    ok: true,
    pagoId,
    nuevoEstatus,
    totalAbonado,
    abonosCount: abonos.length,
  };
}

// Helper: encuentra o crea el Pago base
async function getOCrearPagoBase({ pagoId, idAlumno, grupoId, nombreAlumno }) {
  let pagoBase = await Pago.findOne({ pagoId });
  if (pagoBase) return pagoBase;

  const pagoIdSinMes = crearPagoId(idAlumno, grupoId);
  pagoBase = await Pago.findOne({ pagoId: pagoIdSinMes });
  if (pagoBase) return pagoBase;

  const inscripcion = await Inscripcion.findOne({
    idAlumno,
    grupoId,
    estatus: { $in: ["Activa", "activa", "ACTIVA"] },
  });
  if (!inscripcion) return null;

  pagoBase = await Pago.create({
    pagoId: pagoIdSinMes,
    idAlumno,
    grupoId,
    nombreAlumno: nombreAlumno || inscripcion.nombreAlumno,
    nombreCurso: inscripcion.nombreCurso || "Curso",
    diaPago: inscripcion.diaPago || 1,
    montoPago: Number(inscripcion.montoMensualidad) || 0,
    fechaInicioPago: inscripcion.fechaInicioPago || new Date(),
    activo: true,
    periodo: "Mes",
    estatus: "Pendiente",
    descuentoAplicado: 0,
    tipoPago: "normal",
  });
  console.log(`✅ Pago base creado automáticamente: ${pagoIdSinMes}`);
  return pagoBase;
}

// ============================================================
// POST / – REGISTRAR ABONO
// ============================================================
router.post("/", async (req, res) => {
  try {
    const {
      pagoId,
      montoAbono,
      nombreAlumno,
      metodoAbono,
      fechaAbono: fechaAbonoRaw,
      idAlumno,
      grupoId,
      esDescuento = false,
      descuentoPorcentaje = 0,
      mesesCubiertos = 1,
      nuevoMontoMensual,
    } = req.body;

    if (
      !pagoId ||
      montoAbono === undefined ||
      montoAbono === null ||
      Number(montoAbono) < 0 ||
      !idAlumno ||
      !grupoId
    ) {
      return res
        .status(400)
        .json({ error: "Faltan datos obligatorios o monto inválido" });
    }

    const fechaAbono = parseFechaAbono(fechaAbonoRaw);
    const montoTotal = Number(montoAbono);
    const meses = Math.max(1, Number(mesesCubiertos) || 1);

    const pagoBase = await getOCrearPagoBase({
      pagoId,
      idAlumno,
      grupoId,
      nombreAlumno,
    });
    if (!pagoBase) {
      return res
        .status(404)
        .json({ error: "No se encontró inscripción activa para este alumno" });
    }

    const diaPago = pagoBase.diaPago || 1;
    const fechaInicio = new Date(pagoBase.fechaInicioPago);

    // CASO $0
    if (montoTotal === 0) {
      const nuevoAbono = new Abono({
        abonoId: await generarId("abono"),
        pagoId,
        idAlumno,
        grupoId,
        nombreAlumno: nombreAlumno || pagoBase.nombreAlumno,
        montoAbono: 0,
        metodoAbono: metodoAbono || "Efectivo",
        fechaAbono,
        notas: "Abono de $0 (mes sin pago)",
      });
      await nuevoAbono.save();

      const pagoObjetivo = await Pago.findOne({ pagoId });
      if (pagoObjetivo) {
        pagoObjetivo.estatus = "Pagado";
        pagoObjetivo.fechaPago = fechaAbono;
        pagoObjetivo.notas = "Mes sin pago (abonado en $0)";
        await pagoObjetivo.save();
      }

      cache.flushAll();
      return res.status(201).json({
        message: "Abono de $0 registrado. Mes marcado como Pagado.",
        abono: nuevoAbono,
      });
    }

    // CASO NORMAL: 1 mes
    if (meses === 1) {
      const pagoMes = await Pago.findOne({ pagoId });
      const montoMensual = Number(pagoMes?.montoPago || montoTotal);

      const nuevoAbono = new Abono({
        abonoId: await generarId("abono"),
        pagoId,
        idAlumno,
        grupoId,
        nombreAlumno: nombreAlumno || pagoBase.nombreAlumno,
        montoAbono: montoTotal,
        metodoAbono: metodoAbono || "Efectivo",
        fechaAbono,
        numeroDeabono: "1",
        notas: `Abono para ${pagoId}`,
        esDescuento,
        descuentoPorcentaje: esDescuento ? descuentoPorcentaje : 0,
      });
      await nuevoAbono.save();

      if (pagoMes) {
        // ✅ FIX: un abono con descuento aplicado se considera saldado
        // aunque el monto sea menor al montoPago original.
        const cubreConDescuento =
          esDescuento && descuentoPorcentaje > 0 && montoTotal > 0;
        const pagoCompleto = cubreConDescuento || montoTotal >= montoMensual;

        pagoMes.estatus = pagoCompleto ? "Pagado" : "Parcial";
        if (pagoCompleto) {
          pagoMes.fechaPago = fechaAbono;
        }
        if (esDescuento && descuentoPorcentaje > 0) {
          pagoMes.descuentoAplicado = descuentoPorcentaje;
        }
        await pagoMes.save();
      }

      if (nuevoMontoMensual && Number(nuevoMontoMensual) > 0) {
        const mesSig = new Date(fechaInicio);
        mesSig.setMonth(mesSig.getMonth() + 1);
        mesSig.setHours(12, 0, 0, 0);
        const mesStrSig = `${mesSig.getFullYear()}-${String(
          mesSig.getMonth() + 1
        ).padStart(2, "0")}`;
        const pagoFuturoId = crearPagoId(idAlumno, grupoId, mesStrSig);
        await Pago.updateOne(
          { pagoId: pagoFuturoId },
          {
            $set: {
              montoPago: Number(nuevoMontoMensual),
              descuentoAplicado: 0,
            },
          }
        );
      }

      cache.flushAll();
      return res.status(201).json({
        message: "Abono registrado",
        abonos: [nuevoAbono],
      });
    }

    // CASO ANTICIPO
    const pagoPrimerMes = await Pago.findOne({ pagoId });
    if (!pagoPrimerMes) {
      return res
        .status(404)
        .json({ error: "No se encontró el pago del primer mes del anticipo" });
    }

    const abonoPrimero = new Abono({
      abonoId: await generarId("abono"),
      pagoId,
      idAlumno,
      grupoId,
      nombreAlumno: nombreAlumno || pagoBase.nombreAlumno,
      montoAbono: montoTotal,
      metodoAbono: metodoAbono || "Efectivo",
      fechaAbono,
      numeroDeabono: "1",
      notas: `Anticipo por ${meses} meses (1/${meses})`,
      mesesCubiertos: meses,
      esDescuento,
      descuentoPorcentaje: esDescuento ? descuentoPorcentaje : 0,
    });
    await abonoPrimero.save();

    pagoPrimerMes.montoPago = montoTotal;
    pagoPrimerMes.estatus = "Pagado";
    pagoPrimerMes.fechaPago = fechaAbono;
    pagoPrimerMes.tipoPago = "adelantado";
    pagoPrimerMes.notas = `Anticipo ${meses} meses – mes 1 de ${meses}`;
    await pagoPrimerMes.save();

    const abonosCreados = [abonoPrimero];

    for (let i = 1; i < meses; i++) {
      const mes = new Date(fechaInicio);
      mes.setMonth(mes.getMonth() + i);
      const ultimoDia = new Date(
        mes.getFullYear(),
        mes.getMonth() + 1,
        0
      ).getDate();
      const diaReal = Math.min(diaPago, ultimoDia);
      mes.setDate(diaReal);
      mes.setHours(12, 0, 0, 0);

      const mesStr = `${mes.getFullYear()}-${String(mes.getMonth() + 1).padStart(
        2,
        "0"
      )}`;
      const pagoIdMes = crearPagoId(idAlumno, grupoId, mesStr);

      let pagoMes = await Pago.findOne({ pagoId: pagoIdMes });
      if (!pagoMes) {
        pagoMes = new Pago({
          pagoId: pagoIdMes,
          idAlumno,
          grupoId,
          nombreAlumno: nombreAlumno || pagoBase.nombreAlumno,
          nombreCurso: pagoBase.nombreCurso,
          diaPago,
          montoPago: 0,
          fechaInicioPago: mes,
          activo: true,
          periodo: "Mes",
          estatus: "Pagado",
          tipoPago: "adelantado",
          fechaPago: fechaAbono,
          notas: `Cubierto por anticipo – mes ${i + 1} de ${meses}`,
        });
      } else {
        pagoMes.montoPago = 0;
        pagoMes.estatus = "Pagado";
        pagoMes.tipoPago = "adelantado";
        pagoMes.fechaPago = fechaAbono;
        pagoMes.notas = `Cubierto por anticipo – mes ${i + 1} de ${meses}`;
      }
      await pagoMes.save();
    }

    cache.flushAll();
    console.log(
      `✅ Anticipo de ${meses} meses registrado para ${idAlumno} en ${pagoId}`
    );

    return res.status(201).json({
      message: `Anticipo registrado. ${meses} meses cubiertos.`,
      abonos: abonosCreados,
    });
  } catch (error) {
    console.error("❌ Error al registrar abono:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// PUT /:abonoId – EDITAR ABONO
// ============================================================
router.put("/:abonoId", async (req, res) => {
  try {
    const { abonoId } = req.params;
    const { montoAbono, fechaAbono, metodoAbono, notas } = req.body;

    const abono = await Abono.findOne({ abonoId });
    if (!abono) {
      return res.status(404).json({ error: "Abono no encontrado" });
    }

    if (montoAbono !== undefined) {
      const monto = Number(montoAbono);
      if (isNaN(monto) || monto < 0) {
        return res.status(400).json({ error: "Monto inválido" });
      }
      abono.montoAbono = monto;
    }

    if (fechaAbono !== undefined) {
      const fecha = parseFechaAbono(fechaAbono);
      if (isNaN(fecha.getTime())) {
        return res.status(400).json({ error: "Fecha inválida" });
      }
      abono.fechaAbono = fecha;
    }

    if (metodoAbono !== undefined) {
      abono.metodoAbono = String(metodoAbono).trim() || "Efectivo";
    }

    if (notas !== undefined) {
      abono.notas = String(notas).trim();
    }

    await abono.save();

    const resultado = await recalcularPagoDesdeAbonos(abono.pagoId);

    cache.flushAll();

    console.log(`✏️ Abono editado: ${abonoId} | pagoId: ${abono.pagoId}`);

    res.json({
      message: "Abono actualizado",
      abono,
      recalculo: resultado,
    });
  } catch (error) {
    console.error("❌ Error al editar abono:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// DELETE /:abonoId – ELIMINAR ABONO
// ============================================================
router.delete("/:abonoId", async (req, res) => {
  try {
    const { abonoId } = req.params;

    const abono = await Abono.findOne({ abonoId });
    if (!abono) {
      return res.status(404).json({ error: "Abono no encontrado" });
    }

    const pagoId = abono.pagoId;

    const pago = await Pago.findOne({ pagoId });
    if (pago && pago.tipoPago === "adelantado") {
      console.warn(
        `⚠️ Eliminando abono de un Pago marcado como anticipo: ${abonoId} | ${pagoId}`
      );
    }

    await Abono.deleteOne({ _id: abono._id });

    const resultado = await recalcularPagoDesdeAbonos(pagoId);

    cache.flushAll();

    console.log(`🗑️ Abono eliminado: ${abonoId} | pagoId: ${pagoId}`);

    res.json({
      message: "Abono eliminado",
      abonoId,
      pagoId,
      recalculo: resultado,
    });
  } catch (error) {
    console.error("❌ Error al eliminar abono:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// GET /pago/:pagoId
// ============================================================
router.get("/pago/:pagoId", async (req, res) => {
  try {
    const { pagoId } = req.params;
    const abonos = await Abono.find({ pagoId }).sort({ fechaAbono: -1 });
    res.json(abonos);
  } catch (error) {
    console.error("❌ Error al obtener abonos:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// GET /alumno/:idAlumno
// ============================================================
router.get("/alumno/:idAlumno", async (req, res) => {
  try {
    const { idAlumno } = req.params;
    const abonos = await Abono.find({ idAlumno }).sort({ fechaAbono: -1 });
    res.json(abonos);
  } catch (error) {
    console.error("❌ Error al obtener abonos del alumno:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;