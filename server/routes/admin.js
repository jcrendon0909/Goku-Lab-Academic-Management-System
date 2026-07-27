import express from "express";
import Inscripcion from "../models/Inscripcion.js";
import Pago from "../models/Pago.js";

const router = express.Router();

// GET /admin/inscripciones - Listado paginado (sin cambios)
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

// PATCH /admin/inscripciones/:id - Actualización individual (segura)
router.patch("/inscripciones/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { montoMensualidad, diaPago, fechaInicioPago, modalidad, comentarios } = req.body;

    // Validar datos básicos
    if (montoMensualidad !== undefined && (isNaN(montoMensualidad) || montoMensualidad < 0)) {
      return res.status(400).json({ error: "Monto inválido" });
    }
    if (diaPago !== undefined && (isNaN(diaPago) || diaPago < 1 || diaPago > 31)) {
      return res.status(400).json({ error: "Día de pago inválido (1-31)" });
    }

    // Obtener la inscripción actual
    const inscripcion = await Inscripcion.findById(id);
    if (!inscripcion) {
      return res.status(404).json({ error: "Inscripción no encontrada" });
    }

    // Construir objeto de actualización
    const updateData = {};
    const cambios = {};

    if (montoMensualidad !== undefined && montoMensualidad !== inscripcion.montoMensualidad) {
      updateData.montoMensualidad = montoMensualidad;
      cambios.montoMensualidad = { old: inscripcion.montoMensualidad, new: montoMensualidad };
    }
    if (diaPago !== undefined && diaPago !== inscripcion.diaPago) {
      updateData.diaPago = diaPago;
      cambios.diaPago = { old: inscripcion.diaPago, new: diaPago };
    }
    if (fechaInicioPago !== undefined) {
      const nuevaFecha = new Date(fechaInicioPago);
      if (!isNaN(nuevaFecha) && nuevaFecha.getTime() !== inscripcion.fechaInicioPago?.getTime()) {
        updateData.fechaInicioPago = nuevaFecha;
        cambios.fechaInicioPago = { old: inscripcion.fechaInicioPago, new: nuevaFecha };
      }
    }
    if (modalidad !== undefined && modalidad !== inscripcion.modalidad) {
      updateData.modalidad = modalidad;
      cambios.modalidad = { old: inscripcion.modalidad, new: modalidad };
    }
    if (comentarios !== undefined && comentarios !== inscripcion.comentarios) {
      updateData.comentarios = comentarios;
      cambios.comentarios = { old: inscripcion.comentarios, new: comentarios };
    }

    if (Object.keys(cambios).length === 0) {
      return res.json({ ok: true, mensaje: "Sin cambios" });
    }

    // Registrar historial de cambios (usando $push para evitar validación de esquema)
    await Inscripcion.updateOne(
      { _id: id },
      {
        $set: updateData,
        $push: {
          historialModificaciones: {
            fecha: new Date(),
            usuario: "admin",
            cambios,
          },
        },
      }
    );

    // Sincronizar con el pago asociado
    const pago = await Pago.findOne({ idAlumno: inscripcion.idAlumno, grupoId: inscripcion.grupoId });
    if (pago) {
      const pagoUpdate = {};
      if (cambios.montoMensualidad) pagoUpdate.montoPago = cambios.montoMensualidad.new;
      if (cambios.diaPago) pagoUpdate.diaPago = cambios.diaPago.new;
      if (cambios.fechaInicioPago) pagoUpdate.fechaInicioPago = cambios.fechaInicioPago.new;
      if (Object.keys(pagoUpdate).length > 0) {
        await Pago.updateOne(
          { _id: pago._id },
          {
            $set: pagoUpdate,
            $push: {
              historialModificaciones: {
                fecha: new Date(),
                usuario: "admin",
                cambios: pagoUpdate,
              },
            },
          }
        );
      }
    }

    // Obtener la inscripción actualizada para devolver
    const updatedInscripcion = await Inscripcion.findById(id).lean();
    res.json({ ok: true, mensaje: "Inscripción actualizada", data: updatedInscripcion });
  } catch (error) {
    console.error("❌ Error PATCH /admin/inscripciones/:id:", error);
    // Manejar error de índice único (duplicado)
    if (error.code === 11000) {
      return res.status(400).json({ error: "Ya existe una inscripción para este alumno y grupo" });
    }
    res.status(500).json({ error: error.message });
  }
});

// POST /admin/inscripciones/actualizar-multiples - Lote (seguro)
router.post("/inscripciones/actualizar-multiples", async (req, res) => {
  try {
    const { updates } = req.body;
    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ error: "No se enviaron actualizaciones" });
    }

    const resultados = [];
    for (const item of updates) {
      const { id, montoMensualidad, diaPago, fechaInicioPago, modalidad, comentarios } = item;

      // Obtener inscripción actual
      const inscripcion = await Inscripcion.findById(id);
      if (!inscripcion) continue;

      const updateData = {};
      const cambios = {};

      if (montoMensualidad !== undefined && montoMensualidad !== inscripcion.montoMensualidad) {
        updateData.montoMensualidad = montoMensualidad;
        cambios.montoMensualidad = { old: inscripcion.montoMensualidad, new: montoMensualidad };
      }
      if (diaPago !== undefined && diaPago !== inscripcion.diaPago) {
        updateData.diaPago = diaPago;
        cambios.diaPago = { old: inscripcion.diaPago, new: diaPago };
      }
      if (fechaInicioPago !== undefined) {
        const nuevaFecha = new Date(fechaInicioPago);
        if (!isNaN(nuevaFecha) && nuevaFecha.getTime() !== inscripcion.fechaInicioPago?.getTime()) {
          updateData.fechaInicioPago = nuevaFecha;
          cambios.fechaInicioPago = { old: inscripcion.fechaInicioPago, new: nuevaFecha };
        }
      }
      if (modalidad !== undefined && modalidad !== inscripcion.modalidad) {
        updateData.modalidad = modalidad;
        cambios.modalidad = { old: inscripcion.modalidad, new: modalidad };
      }
      if (comentarios !== undefined && comentarios !== inscripcion.comentarios) {
        updateData.comentarios = comentarios;
        cambios.comentarios = { old: inscripcion.comentarios, new: comentarios };
      }

      if (Object.keys(cambios).length > 0) {
        await Inscripcion.updateOne(
          { _id: id },
          {
            $set: updateData,
            $push: {
              historialModificaciones: {
                fecha: new Date(),
                usuario: "admin",
                cambios,
              },
            },
          }
        );

        // Sincronizar pago
        const pago = await Pago.findOne({ idAlumno: inscripcion.idAlumno, grupoId: inscripcion.grupoId });
        if (pago) {
          const pagoUpdate = {};
          if (cambios.montoMensualidad) pagoUpdate.montoPago = cambios.montoMensualidad.new;
          if (cambios.diaPago) pagoUpdate.diaPago = cambios.diaPago.new;
          if (cambios.fechaInicioPago) pagoUpdate.fechaInicioPago = cambios.fechaInicioPago.new;
          if (Object.keys(pagoUpdate).length > 0) {
            await Pago.updateOne(
              { _id: pago._id },
              {
                $set: pagoUpdate,
                $push: {
                  historialModificaciones: {
                    fecha: new Date(),
                    usuario: "admin",
                    cambios: pagoUpdate,
                  },
                },
              }
            );
          }
        }
        resultados.push({ id, ok: true, cambios });
      } else {
        resultados.push({ id, ok: true, cambios: {} });
      }
    }

    res.json({ ok: true, mensaje: `${resultados.length} inscripciones procesadas`, resultados });
  } catch (error) {
    console.error("❌ Error POST /admin/inscripciones/actualizar-multiples:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;