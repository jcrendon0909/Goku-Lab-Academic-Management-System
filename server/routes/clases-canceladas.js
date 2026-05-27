import express from "express";
import ClaseCancelada from "../models/ClaseCancelada.js";
import Grupo from "../models/Grupo.js";
import { generarId } from "../utils/generarId.js";
import { parseFechaFlexible, extraerFecha } from "../utils/parseFechas.js";

const router = express.Router();

/**
 * GET /api/clases-canceladas
 * Obtener todas las cancelaciones de clases
 */
router.get("/", async (req, res) => {
  try {
    const cancelaciones = await ClaseCancelada.find({ estatus: "activa" })
      .sort({ fecha: -1 })
      .lean();
    res.json(cancelaciones);
  } catch (error) {
    console.error("ERROR GET CLASES CANCELADAS:", error);
    res.status(500).json({ 
      error: "Error al obtener clases canceladas",
      detalle: error.message 
    });
  }
});

/**
 * GET /api/clases-canceladas/:idGrupo
 * Obtener cancelaciones de un grupo específico
 */
router.get("/:idGrupo", async (req, res) => {
  try {
    const { idGrupo } = req.params;

    const cancelaciones = await ClaseCancelada.find({
      idGrupo: String(idGrupo).trim(),
      estatus: "activa"
    })
      .sort({ fecha: -1 })
      .lean();

    res.json(cancelaciones);
  } catch (error) {
    console.error("ERROR GET CLASES CANCELADAS POR GRUPO:", error);
    res.status(500).json({ 
      error: "Error al obtener cancelaciones del grupo",
      detalle: error.message 
    });
  }
});

/**
 * POST /api/clases-canceladas
 * Cancelar una clase específica
 */
router.post("/", async (req, res) => {
  try {
    const { 
      idGrupo, 
      fecha, 
      motivo, 
      canceladoPor, 
      nota 
    } = req.body;

    // Validaciones
    if (!idGrupo || !String(idGrupo).trim()) {
      return res.status(400).json({ error: "Falta idGrupo" });
    }

    if (!fecha) {
      return res.status(400).json({ error: "Falta fecha" });
    }

    // Parsear fecha
    const fechaParsed = parseFechaFlexible(fecha);
    if (!fechaParsed || isNaN(fechaParsed.getTime())) {
      return res.status(400).json({ 
        error: "fecha no es válida (usa YYYY-MM-DD o ISO 8601)" 
      });
    }

    // Verificar que el grupo existe
    const grupo = await Grupo.findOne({
      $or: [
        { IdGrupo: String(idGrupo).trim() },
        { idGrupo: String(idGrupo).trim() }
      ]
    }).lean();

    if (!grupo) {
      return res.status(404).json({ 
        error: `Grupo "${idGrupo}" no existe` 
      });
    }

    // Verificar que no hay ya una cancelación activa para esa fecha
    const yaExiste = await ClaseCancelada.findOne({
      idGrupo: String(idGrupo).trim(),
      fecha: {
        $gte: new Date(fechaParsed.getFullYear(), fechaParsed.getMonth(), fechaParsed.getDate()),
        $lt: new Date(fechaParsed.getFullYear(), fechaParsed.getMonth(), fechaParsed.getDate() + 1)
      },
      estatus: "activa"
    }).lean();

    if (yaExiste) {
      return res.status(409).json({
        error: "Ya existe una cancelación activa para esa fecha en este grupo",
        claseCanceladaId: yaExiste.claseCanceladaId
      });
    }

    // Crear la cancelación
    const nuevaId = await generarId("clase_cancelada");
    const nuevaCancelacion = new ClaseCancelada({
      claseCanceladaId: nuevaId,
      idGrupo: String(idGrupo).trim(),
      fecha: fechaParsed,
      motivo: motivo || "Clase cancelada",
      canceladoPor: canceladoPor || "",
      nota: nota || ""
    });

    const guardada = await nuevaCancelacion.save();

    res.status(201).json({
      ok: true,
      claseCancelada: guardada
    });
  } catch (error) {
    console.error("ERROR POST CLASE CANCELADA:", error);
    res.status(500).json({ 
      error: "Error al cancelar clase",
      detalle: error.message 
    });
  }
});

/**
 * DELETE /api/clases-canceladas/:claseCanceladaId
 * Revertir una cancelación de clase (marcar como revertida)
 */
router.delete("/:claseCanceladaId", async (req, res) => {
  try {
    const { claseCanceladaId } = req.params;

    const cancelacion = await ClaseCancelada.findOne({
      claseCanceladaId: String(claseCanceladaId).trim()
    });

    if (!cancelacion) {
      return res.status(404).json({
        error: "No se encontró la cancelación"
      });
    }

    // Marcar como revertida en lugar de eliminar (auditoría)
    cancelacion.estatus = "revertida";
    const actualizada = await cancelacion.save();

    res.status(200).json({
      ok: true,
      mensaje: "Cancelación revertida correctamente",
      claseCancelada: actualizada
    });
  } catch (error) {
    console.error("ERROR DELETE CLASE CANCELADA:", error);
    res.status(500).json({ 
      error: "Error al revertir cancelación",
      detalle: error.message 
    });
  }
});

export default router;
