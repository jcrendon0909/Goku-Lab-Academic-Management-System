import express from "express";
import Pago from "../models/Pago.js";
import Inscripcion from "../models/Inscripcion.js";
import Grupo from "../models/Grupo.js";
import { crearPagoId } from "../utils/pagos.js";
import cache from "../utils/cache.js";

const router = express.Router();

// ============================================================
// SINCRONIZACIÓN BÁSICA (se mantiene por compatibilidad)
// ============================================================
export async function sincronizarPagosDesdeInscripciones() {
  const inscripciones = await Inscripcion.find({
    estatus: { $ne: "Baja" },
    montoMensualidad: { $gt: 0 },
  }).lean();

  if (!inscripciones.length) return;

  const grupos = await Grupo.find().lean();
  const gruposMap = new Map();
  for (const g of grupos) {
    const id = String(g.IdGrupo || g.idGrupo || "").trim();
    if (id) gruposMap.set(id.toUpperCase(), g);
  }

  const bulkOps = [];

  for (const ins of inscripciones) {
    const idAlumno = String(ins.idAlumno || "").trim();
    const grupoId = String(ins.grupoId || ins.GrupoId || "").trim();
    if (!idAlumno || !grupoId) continue;

    const fechaInicio = ins.fechaInicioPago || ins.fechaInscripcion || new Date();
    fechaInicio.setHours(12, 0, 0, 0);
    const mesStr = `${fechaInicio.getFullYear()}-${String(
      fechaInicio.getMonth() + 1
    ).padStart(2, "0")}`;
    const pagoId = crearPagoId(idAlumno, grupoId, mesStr);

    const grupo = gruposMap.get(grupoId.toUpperCase());
    const montoBase = Number(ins.montoMensualidad);

    const pagoExistente = await Pago.findOne({ pagoId }).lean();
    if (pagoExistente) continue;

    bulkOps.push({
      updateOne: {
        filter: { pagoId },
        update: {
          $setOnInsert: {
            pagoId,
            idAlumno,
            nombreAlumno: ins.nombreAlumno || idAlumno,
            grupoId,
            nombreCurso: grupo?.nombreCurso || "Curso",
            diaPago: Number(ins.diaPago) || 1,
            fechaInicioPago: fechaInicio,
            activo: true,
            fechaBaja: null,
            estatus: "Pendiente",
            montoPago: montoBase,
            descuentoAplicado: 0,
            tipoPago: "normal",
            periodo: "Mes",
          },
        },
        upsert: true,
      },
    });
  }

  if (bulkOps.length > 0) {
    const result = await Pago.bulkWrite(bulkOps);
    console.log(
      `✅ Sincronización: ${result.modifiedCount} mod, ${result.upsertedCount} nuevos`
    );
  }
}

// ============================================================
// GET /lista-completa
// CAMBIO CLAVE: usa `pago.estatus` como fuente de verdad.
// ============================================================
router.get("/lista-completa", async (req, res) => {
  try {
    const {
      mes,
      anio,
      vista = "control",
      busqueda = "",
      page = 1,
      limit = 50,
      criterioFechaPagados = "real",
    } = req.query;

    const cacheKey = `pagos-${mes}-${anio}-${vista}-${busqueda}-${page}-${limit}-${criterioFechaPagados}`;
    const cachedData = cache.get(cacheKey);
    if (cachedData) return res.json(cachedData);

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const matchBase = {
      activo: true,
      pagoId: { $regex: /-\d{4}-\d{2}$/ },
    };
    if (busqueda) {
      matchBase.nombreAlumno = { $regex: busqueda, $options: "i" };
    }

    const pagos = await Pago.aggregate([
      { $match: matchBase },
      {
        $lookup: {
          from: "abonos",
          let: { idDelPago: "$pagoId" },
          pipeline: [
            { $match: { $expr: { $eq: ["$pagoId", "$$idDelPago"] } } },
            { $sort: { fechaAbono: 1 } },
          ],
          as: "historialAbonos",
        },
      },
    ]);

    // Agrupar por alumno+grupo
    const alumnosMap = new Map();
    for (const pago of pagos) {
      const key = `${pago.idAlumno}-${pago.grupoId}`;
      if (!alumnosMap.has(key)) {
        alumnosMap.set(key, {
          idAlumno: pago.idAlumno,
          grupoId: pago.grupoId,
          nombreAlumno: pago.nombreAlumno,
          nombreCurso: pago.nombreCurso,
          pagos: [],
          historialAbonos: [],
          activo: true,
          fechaBaja: null,
        });
      }
      const alum = alumnosMap.get(key);
      alum.pagos.push(pago);
      alum.historialAbonos = alum.historialAbonos.concat(
        pago.historialAbonos || []
      );
    }

    const hoy = new Date();
    hoy.setHours(12, 0, 0, 0);
    const mesActual = mes ? parseInt(mes) : hoy.getMonth() + 1;
    const anioActual = anio ? parseInt(anio) : hoy.getFullYear();
    const totalMesesHoy = anioActual * 12 + mesActual;

    const resultadoCompleto = [];

    for (const [key, alum] of alumnosMap) {
      const pagosOrdenados = alum.pagos.sort(
        (a, b) =>
          new Date(a.fechaInicioPago).getTime() -
          new Date(b.fechaInicioPago).getTime()
      );

      const periodosMensuales = pagosOrdenados.map((pago) => {
        const fechaVencimiento = new Date(pago.fechaInicioPago);
        fechaVencimiento.setHours(12, 0, 0, 0);

        const abonosDelPago = pago.historialAbonos || [];
        const totalAbonado = abonosDelPago.reduce(
          (sum, a) => sum + (a.montoAbono || 0),
          0
        );

        // ✅ Estatus: la fuente de verdad es pago.estatus, fallback a cálculo
        let status;
        if (pago.estatus === "Pagado" || pago.tipoPago === "adelantado") {
          status = "Pagado";
        } else if (totalAbonado >= (pago.montoPago || 0)) {
          status = "Pagado";
        } else if (totalAbonado > 0) {
          status = "Parcial";
        } else {
          status = "Pendiente";
        }

        const saldo =
          status === "Pagado"
            ? 0
            : Math.max(0, (pago.montoPago || 0) - totalAbonado);

        return {
          clave: `${fechaVencimiento.getFullYear()}-${String(
            fechaVencimiento.getMonth() + 1
          ).padStart(2, "0")}`,
          nombreMes: fechaVencimiento.toLocaleDateString("es-ES", {
            month: "long",
            year: "numeric",
          }),
          vencimiento: fechaVencimiento.toISOString(),
          monto: pago.montoPago || 0,
          pagado: status === "Pagado" ? pago.montoPago || 0 : totalAbonado,
          saldo,
          status,
          pagoId: pago.pagoId,
          tipoPago: pago.tipoPago || "normal",
          metodoAbono:
            abonosDelPago.length > 0
              ? abonosDelPago[abonosDelPago.length - 1].metodoAbono
              : null,
          fechaPagoReal:
            abonosDelPago.length > 0
              ? abonosDelPago[abonosDelPago.length - 1].fechaAbono
              : pago.fechaPago || null,
        };
      });

      const tienePendientesPasados = periodosMensuales.some((m) => {
        const v = new Date(m.vencimiento);
        v.setHours(12, 0, 0, 0);
        return (
          v.getFullYear() * 12 + v.getMonth() <= totalMesesHoy &&
          m.status !== "Pagado"
        );
      });
      const tieneProximosFuturos = periodosMensuales.some((m) => {
        const v = new Date(m.vencimiento);
        v.setHours(12, 0, 0, 0);
        return (
          v.getFullYear() * 12 + v.getMonth() > totalMesesHoy &&
          m.status !== "Pagado"
        );
      });

      let incluir = false;
      if (vista === "control") {
        incluir = alum.activo !== false && tienePendientesPasados;
      } else if (vista === "registro") {
        incluir =
          periodosMensuales.some((m) => m.status === "Pagado") ||
          (!alum.activo && alum.historialAbonos.length > 0);
      } else if (vista === "proximos") {
        incluir = alum.activo !== false && tieneProximosFuturos;
      }

      if (!incluir) continue;

      const totalMonto = periodosMensuales.reduce((sum, m) => sum + m.monto, 0);
      const totalPagado = periodosMensuales.reduce(
        (sum, m) => sum + m.pagado,
        0
      );
      const saldoTotal = Math.max(0, totalMonto - totalPagado);
      const statusGeneral =
        saldoTotal === 0 ? "Pagado" : totalPagado > 0 ? "Parcial" : "Pendiente";

      const mesActualObj =
        periodosMensuales.find((m) => {
          const v = new Date(m.vencimiento);
          v.setHours(12, 0, 0, 0);
          return (
            v.getMonth() === mesActual - 1 && v.getFullYear() === anioActual
          );
        }) ||
        periodosMensuales.find((m) => m.status !== "Pagado") ||
        periodosMensuales[0];

      resultadoCompleto.push({
        id: key,
        idAlumno: alum.idAlumno,
        grupoId: alum.grupoId,
        nombreAlumno: alum.nombreAlumno,
        nombreCurso: alum.nombreCurso,
        montoTotal: totalMonto,
        montoPagado: totalPagado,
        saldo: saldoTotal,
        status: statusGeneral,
        activo: alum.activo,
        fechaBaja: alum.fechaBaja,
        fechaLimite: mesActualObj?.vencimiento || null,
        periodosMensuales,
        cobroProgramado: false,
        metodoAbono:
          alum.historialAbonos.length > 0
            ? alum.historialAbonos[alum.historialAbonos.length - 1].metodoAbono
            : null,
        fechaPagoReal:
          alum.historialAbonos.length > 0
            ? alum.historialAbonos[alum.historialAbonos.length - 1].fechaAbono
            : null,
      });
    }

    // Deduplicar periodos por clave
    for (const item of resultadoCompleto) {
      if (Array.isArray(item.periodosMensuales)) {
        const vistos = new Set();
        item.periodosMensuales = item.periodosMensuales.filter((p) => {
          if (vistos.has(p.clave)) return false;
          vistos.add(p.clave);
          return true;
        });
      }
    }

    const total = resultadoCompleto.length;
    const paginatedData = resultadoCompleto.slice(skip, skip + limitNum);

    const totalPorRecolectar = paginatedData
      .filter((p) => p.activo !== false)
      .reduce((sum, p) => {
        const mesEnCurso = (p.periodosMensuales || []).find((m) => {
          if (!m.vencimiento) return false;
          const v = new Date(m.vencimiento);
          v.setHours(12, 0, 0, 0);
          return (
            v.getMonth() === mesActual - 1 && v.getFullYear() === anioActual
          );
        });
        return sum + (mesEnCurso ? mesEnCurso.saldo || 0 : 0);
      }, 0);

    const totalRecolectado = paginatedData
      .filter((p) => p.activo !== false)
      .reduce((sum, p) => {
        const mesEnCurso = (p.periodosMensuales || []).find((m) => {
          if (!m.vencimiento) return false;
          const v = new Date(m.vencimiento);
          v.setHours(12, 0, 0, 0);
          return (
            v.getMonth() === mesActual - 1 && v.getFullYear() === anioActual
          );
        });
        return sum + (mesEnCurso ? mesEnCurso.pagado || 0 : 0);
      }, 0);

    const responseData = {
      data: paginatedData,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
      totales: { totalPorRecolectar, totalRecolectado },
    };

    cache.set(cacheKey, responseData);
    res.json(responseData);
  } catch (error) {
    console.error("❌ Error en /lista-completa:", error);
    res.status(500).json({ error: "Error al obtener pagos" });
  }
});

// ============================================================
// PATCH /actualizar-dia/:id
// ============================================================
router.patch("/actualizar-dia/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { nuevoDia } = req.body;
    if (!nuevoDia || nuevoDia < 1 || nuevoDia > 31) {
      return res.status(400).json({ error: "Día inválido" });
    }
    const pago = await Pago.findOne({ pagoId: id });
    if (!pago) return res.status(404).json({ error: "Pago no encontrado" });

    pago.diaPago = nuevoDia;
    pago.updatedAt = new Date();
    await pago.save();

    cache.flushAll();
    res.json({ ok: true, mensaje: "Día actualizado", data: pago });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;