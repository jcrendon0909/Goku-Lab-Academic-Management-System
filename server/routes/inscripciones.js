import express from "express";
import Inscripcion from "../models/Inscripcion.js";
import Grupo from "../models/Grupo.js";
import Pago from "../models/Pago.js";
import { crearPagoId } from "../utils/pagos.js";

const router = express.Router();

// GET / - Obtener todas las inscripciones
router.get("/", async (req, res) => {
  try {
    const inscripciones = await Inscripcion.find().lean();
    res.json(inscripciones);
  } catch (error) {
    console.error("Error GET /inscripciones:", error);
    res.status(500).json({ error: error.message });
  }
});

// POST / - Crear una inscripción
router.post("/", async (req, res) => {
  try {
    const nuevaInscripcion = new Inscripcion(req.body);
    await nuevaInscripcion.save();
    res.status(201).json(nuevaInscripcion);
  } catch (error) {
    console.error("Error POST /inscripciones:", error);
    res.status(500).json({ error: error.message });
  }
});

// PATCH /:idAlumno/:grupoId - Actualizar una inscripción (modalidad, comentarios)
router.patch("/:idAlumno/:grupoId", async (req, res) => {
  try {
    const { idAlumno, grupoId } = req.params;
    const { modalidad, comentarios } = req.body;

    const update = {};
    if (modalidad) update.modalidad = modalidad;
    if (comentarios !== undefined) update.comentarios = comentarios;

    const inscripcion = await Inscripcion.findOneAndUpdate(
      { idAlumno, grupoId },
      { $set: update },
      { new: true }
    );
    if (!inscripcion) {
      return res.status(404).json({ error: "Inscripción no encontrada" });
    }
    res.json(inscripcion);
  } catch (error) {
    console.error("Error PATCH /inscripciones/:idAlumno/:grupoId:", error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /:idAlumno/:grupoId - Eliminar una inscripción (baja)
router.delete("/:idAlumno/:grupoId", async (req, res) => {
  try {
    const { idAlumno, grupoId } = req.params;
    const inscripcion = await Inscripcion.findOneAndDelete({ idAlumno, grupoId });
    if (!inscripcion) {
      return res.status(404).json({ error: "Inscripción no encontrada" });
    }
    res.json({ ok: true, mensaje: "Inscripción eliminada" });
  } catch (error) {
    console.error("Error DELETE /inscripciones/:idAlumno/:grupoId:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;