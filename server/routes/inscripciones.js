import express from "express";
import Inscripcion from "../models/Inscripcion.js";
import Grupo from "../models/Grupo.js";
import Pago from "../models/Pago.js";
import Abono from "../models/Abono.js";
import mongoose from "mongoose";
import { sincronizarPagosDesdeInscripciones } from "./pagos.js";
import { generarPagosHistoricos } from "../utils/pagosHelper.js";
import cache from "../utils/cache.js";

const router = express.Router();

// ===== RUTAS DE PRUEBA =====
router.get("/buscar/:idAlumno/:grupoId", async (req, res) => {
  try {
    const { idAlumno, grupoId } = req.params;
    const inscripciones = await Inscripcion.find({
      idAlumno: idAlumno.trim(),
      grupoId: grupoId.trim(),
    }).lean();
    res.json({ encontrados: inscripciones.length, inscripciones });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/test", (req, res) => {
  res.json({ ok: true, mensaje: "Ruta de inscripciones funcionando" });
});

// ============================================================
// MOVER ALUMNO A OTRO GRUPO
// ============================================================
router.patch("/:idAlumno/mover", async (req, res) => {
  try {
    const { idAlumno } = req.params;
    const { nuevoGrupoId, grupoActualId } = req.body;

    if (!nuevoGrupoId || !grupoActualId) {
      return res
        .status(400)
        .json({ error: "Faltan datos: nuevoGrupoId y grupoActualId" });
    }

    const inscripcion = await Inscripcion.findOne({
      idAlumno: idAlumno.trim(),
      grupoId: grupoActualId.trim(),
      estatus: { $in: ["Activa", "activa", "ACTIVA"] },
    });
    if (!inscripcion) {
      return res
        .status(404)
        .json({ error: "Inscripción activa no encontrada" });
    }

    const nuevoGrupo = await Grupo.findOne({
      IdGrupo: nuevoGrupoId.trim(),
    }).lean();
    if (!nuevoGrupo) {
      return res.status(404).json({ error: "Grupo destino no encontrado" });
    }

    const duplicado = await Inscripcion.findOne({
      idAlumno: idAlumno.trim(),
      grupoId: nuevoGrupoId.trim(),
      estatus: { $in: ["Activa", "activa", "ACTIVA"] },
    });
    if (duplicado) {
      await Inscripcion.updateOne(
        { _id: duplicado._id },
        {
          $set: {
            estatus: "Baja",
            fechaBaja: new Date(),
            motivoBaja: `Fusionado desde ${grupoActualId}`,
          },
        }
      );
    }

    const ocupados = await Inscripcion.countDocuments({
      grupoId: nuevoGrupoId.trim(),
      estatus: { $in: ["Activa", "activa", "ACTIVA"] },
    });
    const capacidad = nuevoGrupo.CapacidadMaxima || 20;
    if (ocupados >= capacidad) {
      return res.status(409).json({ error: "El grupo destino está lleno" });
    }

    await Inscripcion.updateOne(
      { _id: inscripcion._id },
      { $set: { grupoId: nuevoGrupoId.trim() } }
    );

    await Pago.updateMany(
      { idAlumno: idAlumno.trim(), grupoId: grupoActualId.trim() },
      { $set: { grupoId: nuevoGrupoId.trim() } }
    );
    await Abono.updateMany(
      { idAlumno: idAlumno.trim(), grupoId: grupoActualId.trim() },
      { $set: { grupoId: nuevoGrupoId.trim() } }
    );

    await sincronizarPagosDesdeInscripciones();
    cache.flushAll();

    res.status(200).json({
      ok: true,
      mensaje: `Alumno movido de ${grupoActualId} a ${nuevoGrupoId}`,
      fusionado: !!duplicado,
    });
  } catch (error) {
    console.error("❌ ERROR MOVER:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// GET ALL
// ============================================================
router.get("/", async (req, res) => {
  try {
    const inscripciones = await Inscripcion.find().lean();
    res.json(inscripciones);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// GET POR ALUMNO
// ============================================================
router.get("/alumno/:idAlumno", async (req, res) => {
  try {
    const { idAlumno } = req.params;
    const inscripciones = await Inscripcion.find({ idAlumno }).lean();
    res.json(inscripciones);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// POST – CREAR INSCRIPCIÓN + GENERAR PAGOS
// ============================================================
router.post("/", async (req, res) => {
  try {
    const datos = req.body;

    if (!datos.idAlumno || !datos.grupoId) {
      return res
        .status(400)
        .json({ error: "idAlumno y grupoId son requeridos" });
    }

    const grupo = await Grupo.findOne({ IdGrupo: datos.grupoId });
    if (!grupo) {
      return res.status(404).json({ error: "Grupo no encontrado" });
    }

    const fechaInscripcion = datos.fechaInscripcion
      ? new Date(datos.fechaInscripcion)
      : new Date();
    if (isNaN(fechaInscripcion.getTime())) {
      return res
        .status(400)
        .json({ error: "Fecha de inscripción inválida" });
    }

    const nuevaInscripcion = new Inscripcion({
      idAlumno: datos.idAlumno.trim(),
      nombreAlumno: datos.nombreAlumno || "",
      grupoId: datos.grupoId.trim(),
      modalidad: datos.modalidad || "Presencial",
      montoMensualidad:
        datos.montoMensualidad || grupo.precioMensualidad || 0,
      diaPago: datos.diaPago || 5,
      fechaInicioPago: datos.fechaInicioPago || fechaInscripcion,
      comentarios: datos.comentarios || "",
      fechaInscripcion,
      estatus: "Activa",
    });

    await nuevaInscripcion.save();

    await sincronizarPagosDesdeInscripciones();

    try {
      const pagosGenerados = await generarPagosHistoricos(
        nuevaInscripcion,
        false,
        12
      );
      console.log(
        `✅ ${pagosGenerados.length} pagos generados para ${nuevaInscripcion.idAlumno}-${nuevaInscripcion.grupoId}`
      );
    } catch (err) {
      console.error("❌ Error generando pagos:", err);
    }

    cache.flushAll();

    res.status(201).json({
      ok: true,
      mensaje: "Inscripción creada exitosamente",
      inscripcion: nuevaInscripcion,
    });
  } catch (error) {
    console.error("Error POST /inscripciones:", error);
    if (error.code === 11000) {
      return res
        .status(409)
        .json({ error: "El alumno ya está inscrito en este grupo" });
    }
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// PATCH – ACTUALIZAR INSCRIPCIÓN (todos los campos + recálculo)
// ============================================================
router.patch("/:idAlumno/:grupoId", async (req, res) => {
  try {
    const { idAlumno, grupoId } = req.params;
    const {
      modalidad,
      comentarios,
      montoMensualidad,
      diaPago,
      fechaInicioPago,
      estatus,
    } = req.body;

    const inscripcion = await Inscripcion.findOne({ idAlumno, grupoId });
    if (!inscripcion) {
      return res.status(404).json({ error: "Inscripción no encontrada" });
    }

    const cambios = {};
    const historial = [];

    if (modalidad && modalidad !== inscripcion.modalidad) {
      cambios.modalidad = modalidad;
      historial.push({ campo: "modalidad", de: inscripcion.modalidad, a: modalidad });
    }
    if (comentarios !== undefined && comentarios !== inscripcion.comentarios) {
      cambios.comentarios = comentarios;
    }
    if (
      montoMensualidad !== undefined &&
      Number(montoMensualidad) !== inscripcion.montoMensualidad
    ) {
      cambios.montoMensualidad = Number(montoMensualidad);
      historial.push({
        campo: "montoMensualidad",
        de: inscripcion.montoMensualidad,
        a: Number(montoMensualidad),
      });
    }
    if (diaPago !== undefined && Number(diaPago) !== inscripcion.diaPago) {
      cambios.diaPago = Number(diaPago);
      historial.push({ campo: "diaPago", de: inscripcion.diaPago, a: Number(diaPago) });
    }
    if (fechaInicioPago !== undefined) {
      const fechaNueva = new Date(fechaInicioPago);
      const fechaActual = new Date(inscripcion.fechaInicioPago);
      if (
        !isNaN(fechaNueva.getTime()) &&
        fechaNueva.toDateString() !== fechaActual.toDateString()
      ) {
        cambios.fechaInicioPago = fechaNueva;
        historial.push({
          campo: "fechaInicioPago",
          de: fechaActual,
          a: fechaNueva,
        });
      }
    }
    if (estatus && estatus !== inscripcion.estatus) {
      cambios.estatus = estatus;
      historial.push({ campo: "estatus", de: inscripcion.estatus, a: estatus });
    }

    if (Object.keys(cambios).length === 0) {
      return res.json({ ok: true, mensaje: "Sin cambios", inscripcion });
    }

    // Aplicar cambios
    Object.assign(inscripcion, cambios);
    if (historial.length > 0) {
      inscripcion.historialModificaciones =
        inscripcion.historialModificaciones || [];
      inscripcion.historialModificaciones.push({
        fecha: new Date(),
        usuario: "admin",
        cambios: historial,
      });
    }
    await inscripcion.save();

    let pagosActualizados = 0;
    let pagosRegenerados = 0;

    // Si cambió la FECHA DE INICIO: borrar pagos NO pagados y regenerar
    if (cambios.fechaInicioPago !== undefined) {
      const eliminados = await Pago.deleteMany({
        idAlumno,
        grupoId,
        estatus: { $nin: ["Pagado"] },
      });

      const regenerados = await generarPagosHistoricos(inscripcion, false, 12);
      pagosRegenerados = regenerados.length;

      console.log(
        `🔄 Regenerados pagos por cambio de fecha: ${eliminados.deletedCount} eliminados, ${pagosRegenerados} creados`
      );
    } else if (
      cambios.montoMensualidad !== undefined ||
      cambios.diaPago !== undefined
    ) {
      // Actualizar pagos pendientes/parciales sin regenerar
      const pagosAfectados = await Pago.find({
        idAlumno,
        grupoId,
        estatus: { $in: ["Pendiente", "Parcial"] },
        activo: true,
      });

      for (const pago of pagosAfectados) {
        if (cambios.montoMensualidad !== undefined) {
          pago.montoPago = cambios.montoMensualidad;
        }
        if (cambios.diaPago !== undefined) {
          const mesActual = new Date(pago.fechaInicioPago);
          const nuevoDia = cambios.diaPago;
          const ultimoDiaMes = new Date(
            mesActual.getFullYear(),
            mesActual.getMonth() + 1,
            0
          ).getDate();
          const diaReal = Math.min(nuevoDia, ultimoDiaMes);
          mesActual.setDate(diaReal);
          mesActual.setHours(12, 0, 0, 0);
          pago.fechaInicioPago = mesActual;
        }
        await pago.save();
        pagosActualizados++;
      }
    }

    cache.flushAll();

    res.json({
      ok: true,
      mensaje: "Inscripción actualizada",
      inscripcion,
      pagosActualizados,
      pagosRegenerados,
    });
  } catch (error) {
    console.error("Error PATCH /inscripciones:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// DELETE – Eliminar inscripción
// Query param: ?mode=pending (default) | full
//   - pending: borra inscripción + pagos pendientes/parciales
//   - full:    borra inscripción + TODOS los pagos + TODOS los abonos
// ============================================================
router.delete("/:idAlumno/:grupoId", async (req, res) => {
  try {
    const { idAlumno, grupoId } = req.params;
    const mode = req.query.mode || "pending";

    const inscripcion = await Inscripcion.findOneAndDelete({
      idAlumno,
      grupoId,
    });
    if (!inscripcion) {
      return res.status(404).json({ error: "Inscripción no encontrada" });
    }

    let pagosBorrados = 0;
    let abonosBorrados = 0;

    if (mode === "full") {
      // Borrar TODOS los pagos y abonos de este grupo para este alumno
      const resPagos = await Pago.deleteMany({ idAlumno, grupoId });
      const resAbonos = await Abono.deleteMany({ idAlumno, grupoId });
      pagosBorrados = resPagos.deletedCount;
      abonosBorrados = resAbonos.deletedCount;
    } else {
      // Solo borrar pagos Pendiente/Parcial
      const resPagos = await Pago.deleteMany({
        idAlumno,
        grupoId,
        estatus: { $in: ["Pendiente", "Parcial"] },
      });
      pagosBorrados = resPagos.deletedCount;
    }

    cache.flushAll();

    console.log(
      `🗑️ Inscripción eliminada: ${idAlumno}/${grupoId} | mode: ${mode} | pagos: ${pagosBorrados} | abonos: ${abonosBorrados}`
    );

    res.json({
      ok: true,
      mensaje: "Inscripción eliminada",
      mode,
      pagosBorrados,
      abonosBorrados,
    });
  } catch (error) {
    console.error("Error DELETE /inscripciones:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// GET POR GRUPO
// ============================================================
router.get("/grupo/:grupoId", async (req, res) => {
  try {
    const { grupoId } = req.params;
    const inscripciones = await Inscripcion.find({
      grupoId,
      estatus: "Activa",
    }).lean();
    res.status(200).json(inscripciones);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// FINALIZAR CURSO
// ============================================================
router.patch("/:idAlumno/:grupoId/finalizar", async (req, res) => {
  try {
    const { idAlumno, grupoId } = req.params;
    const { fechaFin } = req.body;

    if (!fechaFin) {
      return res
        .status(400)
        .json({ error: "Debes especificar la fecha de finalización" });
    }

    const fechaCorte = new Date(fechaFin);
    if (isNaN(fechaCorte.getTime())) {
      return res
        .status(400)
        .json({ error: "Fecha de finalización inválida" });
    }

    const inscripcion = await Inscripcion.findOne({ idAlumno, grupoId });
    if (!inscripcion) {
      return res.status(404).json({ error: "Inscripción no encontrada" });
    }
    if (inscripcion.estatus === "Finalizada") {
      return res.status(400).json({ error: "El curso ya está finalizado" });
    }

    inscripcion.estatus = "Finalizada";
    inscripcion.fechaFin = fechaCorte;
    await inscripcion.save();

    const pagosFuturos = await Pago.updateMany(
      {
        idAlumno,
        grupoId,
        activo: true,
        fechaInicioPago: { $gt: fechaCorte },
      },
      {
        $set: {
          activo: false,
          estatus: "Cancelado",
          fechaBaja: new Date(),
          notas: `Curso finalizado el ${fechaCorte
            .toISOString()
            .slice(0, 10)}`,
        },
      }
    );

    await sincronizarPagosDesdeInscripciones();
    cache.flushAll();

    res.json({
      ok: true,
      mensaje: "Curso finalizado correctamente",
      data: {
        inscripcion,
        pagosDesactivados: pagosFuturos.modifiedCount,
        fechaCorte: fechaCorte.toISOString(),
      },
    });
  } catch (error) {
    console.error("❌ Error PATCH /inscripciones/finalizar:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;