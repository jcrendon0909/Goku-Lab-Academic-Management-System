import express from "express";
import Reagendacion from "../models/Reagendacion.js";

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
      ReagendacionId,
      idAlumno,
      nombreAlumno,
      IdgrupoOrigen,
      idGrupoOrigen,
      idGrupoNuevo,
      nombreCurso,
      profesorOriginal,
      profesorNuevo,
      fechaHoraOriginal,
      fechaHoraNueva,
      motivo,
      FechaMovimiento,
      estatus,
    } = req.body;

    const grupoOrigenFinal = IdgrupoOrigen || idGrupoOrigen || "";
    const grupoNuevoFinal = idGrupoNuevo || "";

    if (!ReagendacionId) {
      return res.status(400).json({
        error: "Falta ReagendacionId",
      });
    }

    if (!idAlumno) {
      return res.status(400).json({
        error: "Falta idAlumno",
      });
    }

    if (!nombreAlumno) {
      return res.status(400).json({
        error: "Falta nombreAlumno",
      });
    }

    if (!grupoOrigenFinal) {
      return res.status(400).json({
        error: "Falta IdgrupoOrigen",
      });
    }

    if (!grupoNuevoFinal) {
      return res.status(400).json({
        error: "Falta idGrupoNuevo",
      });
    }

    const nuevaReagendacion = new Reagendacion({
      ReagendacionId,
      idAlumno,
      nombreAlumno,
      IdgrupoOrigen: grupoOrigenFinal,
      idGrupoNuevo: grupoNuevoFinal,
      nombreCurso: nombreCurso || "",
      profesorOriginal: profesorOriginal || "",
      profesorNuevo: profesorNuevo || "",
      fechaHoraOriginal: fechaHoraOriginal || "",
      fechaHoraNueva: fechaHoraNueva || "",
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

export default router;