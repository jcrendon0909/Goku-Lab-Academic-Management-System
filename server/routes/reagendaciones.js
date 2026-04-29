import express from "express";
import Reagendacion from "../models/Reagendacion.js";
import { generarId } from "../utils/generarId.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const reagendaciones = await Reagendacion.find().lean();
    console.log("GET /api/reagendaciones:", reagendaciones);
    res.status(200).json(reagendaciones);
  } catch (error) {
    console.error("ERROR GET REAGENDACIONES:", error);
    res.status(500).json({
      error: "Error al obtener reagendaciones",
      detalle: error.message,
    });
  }
});

router.post("/", async (req, res) => {
  try {
    console.log("BODY REAGENDACION RECIBIDO:", req.body);

    const {
      idAlumno,
      nombreAlumno,
      IdgrupoOrigen,
      idGrupoOrigen,
      idGrupoNuevo,
      nombreCurso,
      profesorOriginal,
      profesorNuevo,
      idProfesorOriginal,
      idProfesorNuevo,
      fechaHoraOriginal,
      fechaHoraNueva,
      duracion,
      motivo,
      FechaMovimiento,
      estatus,
    } = req.body;

    const grupoOrigenFinal = IdgrupoOrigen || idGrupoOrigen || "";
    const grupoNuevoFinal = idGrupoNuevo || "";

    if (!idAlumno) {
      return res.status(400).json({ error: "Falta idAlumno" });
    }

    if (!nombreAlumno) {
      return res.status(400).json({ error: "Falta nombreAlumno" });
    }

    if (!grupoOrigenFinal) {
      return res.status(400).json({ error: "Falta IdgrupoOrigen" });
    }

    if (!grupoNuevoFinal) {
      return res.status(400).json({ error: "Falta idGrupoNuevo" });
    }

    if (!fechaHoraOriginal) {
      return res.status(400).json({ error: "Falta fechaHoraOriginal" });
    }

    if (!fechaHoraNueva) {
      return res.status(400).json({ error: "Falta fechaHoraNueva" });
    }

    const nuevoReagendacionId = await generarId("reagendacion");

    const nuevaReagendacion = new Reagendacion({
      ReagendacionId: nuevoReagendacionId,
      idAlumno,
      nombreAlumno,
      IdgrupoOrigen: grupoOrigenFinal,
      idGrupoNuevo: grupoNuevoFinal,
      nombreCurso: nombreCurso || "",
      profesorOriginal: profesorOriginal || "",
      profesorNuevo: profesorNuevo || "",
      idProfesorOriginal: idProfesorOriginal || "",
      idProfesorNuevo: idProfesorNuevo || "",
      fechaHoraOriginal: fechaHoraOriginal || "",
      fechaHoraNueva: fechaHoraNueva || "",
      duracion: duracion || "2 horas",
      motivo: motivo || "Reagendado desde sistema",
      FechaMovimiento: FechaMovimiento || new Date().toISOString(),
      estatus: estatus || "reagendado",
    });

    console.log("DOCUMENTO A GUARDAR:", nuevaReagendacion);

    const guardada = await nuevaReagendacion.save();

    console.log("REAGENDACION GUARDADA:", guardada);

    res.status(201).json(guardada);
  } catch (error) {
    console.error("ERROR AL GUARDAR REAGENDACION:", error);
    res.status(500).json({
      error: "Error al guardar reagendación",
      detalle: error.message,
    });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const eliminada =
      (await Reagendacion.findByIdAndDelete(id)) ||
      (await Reagendacion.findOneAndDelete({ ReagendacionId: id }));

    if (!eliminada) {
      return res.status(404).json({
        error: "No se encontró la reagendación",
      });
    }

    res.status(200).json({
      ok: true,
      mensaje: "Reagendación eliminada correctamente",
      reagendacion: eliminada,
    });
  } catch (error) {
    console.error("ERROR DELETE REAGENDACION:", error);
    res.status(500).json({
      error: "Error al eliminar reagendación",
      detalle: error.message,
    });
  }
});

export default router;