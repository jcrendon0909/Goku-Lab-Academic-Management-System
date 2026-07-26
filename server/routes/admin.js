import express from "express";
import Inscripcion from "../models/Inscripcion.js";
import Pago from "../models/Pago.js";

const router = express.Router();

// ============================================================
// GET /admin/inscripciones - Listado paginado con filtros
// ============================================================
router.get("/inscripciones", async (req, res) => {
  try {
    const { page = 1, limit = 50, filtro = "", grupo = "" } = req.query;
    const skip = (page - 1) * limit;

    let query = { estatus: "Activa" };
    if (filtro) {
      query.$or = [
        { nombreAlumno: { $regex: filtro, $options: "i" } },
        { idAlumno: { $regex: filtro, $options: "i" } },
      ];
    }
    if (grupo) {
      query.grupoId = grupo;
    }

    const [inscripciones, total] = await Promise.all([
      Inscripcion.find(query)
        .sort({ nombreAlumno: 1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Inscripcion.countDocuments(query),
    ]);

    res.json({
      inscripciones,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("❌ Error GET /admin/inscripciones:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// PATCH /admin/inscripciones/:id - Actualización individual
// ============================================================
router.patch("/inscripciones/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { montoMensualidad, diaPago, fechaInicioPago, modalidad, comentarios } = req.body;

    const inscripcion = await Inscripcion.findById(id);
    if (!inscripcion) {
      return res.status(404).json({ error: "Inscripción no encontrada" });
    }

    const cambios = {};
    if (montoMensualidad !== undefined && montoMensualidad !== inscripcion.montoMensualidad) {
      cambios.montoMensualidad = { old: inscripcion.montoMensualidad, new: montoMensualidad };
      inscripcion.montoMensualidad = montoMensualidad;
    }
    if (diaPago !== undefined && diaPago !== inscripcion.diaPago) {
      cambios.diaPago = { old: inscripcion.diaPago, new: diaPago };
      inscripcion.diaPago = diaPago;
    }
    if (fechaInicioPago !== undefined) {
      const nuevaFecha = new Date(fechaInicioPago);
      if (!isNaN(nuevaFecha) && nuevaFecha.getTime() !== inscripcion.fechaInicioPago?.getTime()) {
        cambios.fechaInicioPago = { old: inscripcion.fechaInicioPago, new: nuevaFecha };
        inscripcion.fechaInicioPago = nuevaFecha;
      }
    }
    if (modalidad !== undefined && modalidad !== inscripcion.modalidad) {
      cambios.modalidad = { old: inscripcion.modalidad, new: modalidad };
      inscripcion.modalidad = modalidad;
    }
    if (comentarios !== undefined && comentarios !== inscripcion.comentarios) {
      cambios.comentarios = { old: inscripcion.comentarios, new: comentarios };
      inscripcion.comentarios = comentarios;
    }

    if (Object.keys(cambios).length === 0) {
      return res.json({ ok: true, mensaje: "Sin cambios" });
    }

    // Registrar historial
    inscripcion.historialModificaciones = inscripcion.historialModificaciones || [];
    inscripcion.historialModificaciones.push({
      fecha: new Date(),
      usuario: "admin",
      cambios,
    });
    await inscripcion.save();

    // Sincronizar con el pago asociado
    const pago = await Pago.findOne({ idAlumno: inscripcion.idAlumno, grupoId: inscripcion.grupoId });
    if (pago) {
      const cambiosPago = {};
      if (cambios.montoMensualidad) {
        pago.montoPago = cambios.montoMensualidad.new;
        cambiosPago.montoPago = { old: cambios.montoMensualidad.old, new: cambios.montoMensualidad.new };
      }
      if (cambios.diaPago) {
        pago.diaPago = cambios.diaPago.new;
        cambiosPago.diaPago = { old: cambios.diaPago.old, new: cambios.diaPago.new };
      }
      if (cambios.fechaInicioPago) {
        pago.fechaInicioPago = cambios.fechaInicioPago.new;
        cambiosPago.fechaInicioPago = { old: cambios.fechaInicioPago.old, new: cambios.fechaInicioPago.new };
      }
      if (Object.keys(cambiosPago).length > 0) {
        pago.historialModificaciones = pago.historialModificaciones || [];
        pago.historialModificaciones.push({
          fecha: new Date(),
          usuario: "admin",
          cambios: cambiosPago,
        });
        await pago.save();
      }
    }

    res.json({ ok: true, mensaje: "Inscripción actualizada", data: inscripcion });
  } catch (error) {
    console.error("❌ Error PATCH /admin/inscripciones/:id:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// POST /admin/inscripciones/actualizar-multiples - Lote
// ============================================================
router.post("/inscripciones/actualizar-multiples", async (req, res) => {
  try {
    const { updates } = req.body;
    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ error: "No se enviaron actualizaciones" });
    }

    const resultados = [];
    for (const item of updates) {
      const { id, montoMensualidad, diaPago, fechaInicioPago, modalidad, comentarios } = item;
      const inscripcion = await Inscripcion.findById(id);
      if (!inscripcion) continue;

      const cambios = {};
      if (montoMensualidad !== undefined && montoMensualidad !== inscripcion.montoMensualidad) {
        cambios.montoMensualidad = { old: inscripcion.montoMensualidad, new: montoMensualidad };
        inscripcion.montoMensualidad = montoMensualidad;
      }
      if (diaPago !== undefined && diaPago !== inscripcion.diaPago) {
        cambios.diaPago = { old: inscripcion.diaPago, new: diaPago };
        inscripcion.diaPago = diaPago;
      }
      if (fechaInicioPago !== undefined) {
        const nuevaFecha = new Date(fechaInicioPago);
        if (!isNaN(nuevaFecha) && nuevaFecha.getTime() !== inscripcion.fechaInicioPago?.getTime()) {
          cambios.fechaInicioPago = { old: inscripcion.fechaInicioPago, new: nuevaFecha };
          inscripcion.fechaInicioPago = nuevaFecha;
        }
      }
      if (modalidad !== undefined && modalidad !== inscripcion.modalidad) {
        cambios.modalidad = { old: inscripcion.modalidad, new: modalidad };
        inscripcion.modalidad = modalidad;
      }
      if (comentarios !== undefined && comentarios !== inscripcion.comentarios) {
        cambios.comentarios = { old: inscripcion.comentarios, new: comentarios };
        inscripcion.comentarios = comentarios;
      }

      if (Object.keys(cambios).length > 0) {
        inscripcion.historialModificaciones = inscripcion.historialModificaciones || [];
        inscripcion.historialModificaciones.push({
          fecha: new Date(),
          usuario: "admin",
          cambios,
        });
        await inscripcion.save();

        // Sincronizar pago
        const pago = await Pago.findOne({ idAlumno: inscripcion.idAlumno, grupoId: inscripcion.grupoId });
        if (pago) {
          if (cambios.montoMensualidad) pago.montoPago = cambios.montoMensualidad.new;
          if (cambios.diaPago) pago.diaPago = cambios.diaPago.new;
          if (cambios.fechaInicioPago) pago.fechaInicioPago = cambios.fechaInicioPago.new;
          await pago.save();
        }
        resultados.push({ id: inscripcion._id, ok: true, cambios });
      } else {
        resultados.push({ id: inscripcion._id, ok: true, cambios: {} });
      }
    }

    res.json({ ok: true, mensaje: `${resultados.length} inscripciones procesadas`, resultados });
  } catch (error) {
    console.error("❌ Error POST /admin/inscripciones/actualizar-multiples:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;