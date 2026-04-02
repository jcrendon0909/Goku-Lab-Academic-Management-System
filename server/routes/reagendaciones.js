import express from "express";
import Reagendacion from "../models/Reagendacion.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const reagendaciones = await Reagendacion.find().lean();
    res.json(reagendaciones);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener reagendaciones" });
  }
});

router.post("/", async (req, res) => {
  try {
    console.log("BODY REAGENDACION:", req.body);

    const nuevaReagendacion = new Reagendacion({
      _id: req.body._id,
      ReagendacionId: req.body.ReagendacionId,
      idAlumno: req.body.idAlumno,
      nombreAlumno: req.body.nombreAlumno,
      IdgrupoOrigen: req.body.IdgrupoOrigen || req.body.idGrupoOrigen || "",
      idGrupoNuevo: req.body.idGrupoNuevo || "",
      nombreCurso: req.body.nombreCurso,
      profesorOriginal: req.body.profesorOriginal || "",
      profesorNuevo: req.body.profesorNuevo || "",
      fechaHoraOriginal: req.body.fechaHoraOriginal,
      fechaHoraNueva: req.body.fechaHoraNueva,
      motivo: req.body.motivo || "Reagendado desde sistema",
      FechaMovimiento: req.body.FechaMovimiento || new Date().toISOString(),
      estatus: req.body.estatus || "reagendado"
    });

    const guardada = await nuevaReagendacion.save();
    res.status(201).json(guardada);
  } catch (error) {
    console.error("ERROR AL GUARDAR REAGENDACION:", error);
    res.status(500).json({
      error: "Error al guardar reagendación",
      detalle: error.message
    });
  }
});

export default router;