import express from "express";
import Reagendacion from "../models/Reagendacion.js";
import {
  obtenerNotificacionesPendientes,
  marcarNotificacionComoLeida,
} from "../utils/notificaciones.js";

const router = express.Router();

/**
 * GET /api/notificaciones/profesor/:idProfesor/pendientes
 * Obtener notificaciones pendientes de un profesor
 */
router.get("/profesor/:idProfesor/pendientes", async (req, res) => {
  try {
    const { idProfesor } = req.params;

    if (!idProfesor || !String(idProfesor).trim()) {
      return res.status(400).json({ error: "Falta idProfesor" });
    }

    const notificaciones = await obtenerNotificacionesPendientes(
      String(idProfesor).trim()
    );

    res.json(notificaciones);
  } catch (error) {
    console.error("ERROR GET NOTIFICACIONES PENDIENTES:", error);
    res.status(500).json({
      error: "Error al obtener notificaciones",
      detalle: error.message,
    });
  }
});

/**
 * GET /api/notificaciones/profesor/:idProfesor
 * Obtener todas las notificaciones (pendientes + enviadas) de un profesor
 */
router.get("/profesor/:idProfesor", async (req, res) => {
  try {
    const { idProfesor } = req.params;

    if (!idProfesor || !String(idProfesor).trim()) {
      return res.status(400).json({ error: "Falta idProfesor" });
    }

    // Buscar reagendaciones donde es profesor original o nuevo
    const reagendaciones = await Reagendacion.find({
      $or: [
        { idProfesorOriginal: String(idProfesor).trim() },
        { idProfesorNuevo: String(idProfesor).trim() },
      ],
    })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      total: reagendaciones.length,
      reagendaciones,
    });
  } catch (error) {
    console.error("ERROR GET NOTIFICACIONES:", error);
    res.status(500).json({
      error: "Error al obtener notificaciones",
      detalle: error.message,
    });
  }
});

/**
 * PATCH /api/notificaciones/:reagendacionId/marcar-como-leida
 * Marcar una notificación como leída
 */
router.patch("/:reagendacionId/marcar-como-leida", async (req, res) => {
  try {
    const { reagendacionId } = req.params;

    if (!reagendacionId || !String(reagendacionId).trim()) {
      return res.status(400).json({ error: "Falta reagendacionId" });
    }

    const actualizada = await Reagendacion.findOneAndUpdate(
      { ReagendacionId: String(reagendacionId).trim() },
      {
        $set: {
          "notificacionProfesor.leida": true,
          "notificacionProfesor.fechaLectura": new Date(),
        },
      },
      { new: true }
    ).lean();

    if (!actualizada) {
      return res.status(404).json({
        error: "Reagendación no encontrada",
      });
    }

    res.json({
      ok: true,
      reagendacion: actualizada,
    });
  } catch (error) {
    console.error("ERROR PATCH MARCAR COMO LEIDA:", error);
    res.status(500).json({
      error: "Error al marcar como leída",
      detalle: error.message,
    });
  }
});

export default router;
