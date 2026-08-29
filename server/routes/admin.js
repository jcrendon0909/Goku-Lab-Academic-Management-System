import express from "express";
import Inscripcion from "../models/Inscripcion.js";
import Pago from "../models/Pago.js";
import { sincronizarPagosDesdeInscripciones } from "./pagos.js";

const router = express.Router();

// ============================================================
// GET /admin/inscripciones - Listado paginado con filtros
// ============================================================
router.get("/inscripciones", async (req, res) => {
  // ... (código existente sin cambios)
});

// ============================================================
// PATCH /admin/inscripciones/:id - Actualización individual CON SINCRONIZACIÓN
// ============================================================
router.patch("/inscripciones/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { montoMensualidad, diaPago, fechaInicioPago, modalidad, comentarios } = req.body;

    const inscripcion = await Inscripcion.findById(id);
    if (!inscripcion) {
      return res.status(404).json({ error: "Inscripción no encontrada" });
    }

    // Guardar cambios en inscripción
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

    // Guardar historial
    inscripcion.historialModificaciones = inscripcion.historialModificaciones || [];
    inscripcion.historialModificaciones.push({
      fecha: new Date(),
      usuario: "admin",
      cambios,
    });
    await inscripcion.save();
    await sincronizarPagosDesdeInscripciones();
    cache.flushAll();
    // ============================================================
    // 🔥 SINCRONIZAR PAGOS
    // ============================================================

    const { idAlumno, grupoId } = inscripcion;
    const hoy = new Date();

    // 1. Actualizar el pago activo (acuerdo base) si existe
    const pagoActivo = await Pago.findOne({ idAlumno, grupoId, activo: true });
    if (pagoActivo) {
      const updates = {};
      if (montoMensualidad !== undefined) updates.montoPago = montoMensualidad;
      if (diaPago !== undefined) updates.diaPago = diaPago;
      if (fechaInicioPago !== undefined) updates.fechaInicioPago = new Date(fechaInicioPago);
      if (Object.keys(updates).length > 0) {
        await Pago.updateOne(
          { _id: pagoActivo._id },
          { $set: { ...updates, updatedAt: new Date() } }
        );
        // Registrar historial en el pago (opcional)
      }
    }

    // 2. Actualizar pagos futuros (con fechaInicioPago > hoy)
    if (montoMensualidad !== undefined) {
      await Pago.updateMany(
        {
          idAlumno,
          grupoId,
          activo: true,
          fechaInicioPago: { $gt: hoy }
        },
        {
          $set: {
            montoPago: montoMensualidad,
            diaPago: diaPago !== undefined ? diaPago : undefined,
            updatedAt: new Date()
          }
        }
      );
    } else if (diaPago !== undefined) {
      // Si solo cambió el día de pago, actualizar solo ese campo en futuros pagos
      await Pago.updateMany(
        {
          idAlumno,
          grupoId,
          activo: true,
          fechaInicioPago: { $gt: hoy }
        },
        {
          $set: {
            diaPago: diaPago,
            updatedAt: new Date()
          }
        }
      );
    }

    res.json({
      ok: true,
      mensaje: "Inscripción actualizada y pagos sincronizados",
      data: inscripcion
    });
  } catch (error) {
    console.error("❌ Error PATCH /admin/inscripciones/:id:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// POST /admin/inscripciones/actualizar-multiples - Lote (similar)
// ============================================================
router.post("/inscripciones/actualizar-multiples", async (req, res) => {
  // ... (puedes implementar la misma lógica de sincronización)
});

export default router;