import express from "express";
import Inscripcion from "../models/Inscripcion.js";

const router = express.Router();

const normalizar = (valor) => String(valor || "").trim().toUpperCase();

router.get("/", async (req, res) => {
  try {
    const inscripciones = await Inscripcion.find().lean();
    res.json(inscripciones);
  } catch (error) {
    console.error("ERROR GET INSCRIPCIONES:", error);
    res.status(500).json({ error: "Error al obtener inscripciones" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { idAlumno, nombreAlumno, grupoId } = req.body;

    if (!idAlumno) {
      return res.status(400).json({ error: "Falta idAlumno" });
    }

    if (!nombreAlumno || !String(nombreAlumno).trim()) {
      return res.status(400).json({ error: "Falta nombreAlumno" });
    }

    if (!grupoId) {
      return res.status(400).json({ error: "Falta grupoId" });
    }

    const inscripcionExistente = await Inscripcion.findOne({
      idAlumno,
      grupoId,
    }).lean();

    if (inscripcionExistente) {
      return res.status(409).json({
        error: "El alumno ya está inscrito en este grupo",
      });
    }

    const nuevaInscripcion = new Inscripcion({
      idAlumno,
      nombreAlumno: String(nombreAlumno).trim(),
      grupoId,
    });

    const guardada = await nuevaInscripcion.save();

    res.status(201).json(guardada);
  } catch (error) {
    console.error("ERROR POST INSCRIPCION:", error);
    res.status(500).json({
      error: "Error al crear inscripción",
      detalle: error.message,
    });
  }
});

router.get("/grupo/:grupoId", async (req, res) => {
  try {
    const { grupoId } = req.params;

    const inscripciones = await Inscripcion.find({
      grupoId,
    }).lean();

    res.status(200).json(inscripciones);
  } catch (error) {
    console.error("ERROR GET INSCRIPCIONES POR GRUPO:", error);
    res.status(500).json({
      error: "Error al obtener inscripciones del grupo",
      detalle: error.message,
    });
  }
});

router.get("/alumno/:idAlumno", async (req, res) => {
  try {
    const { idAlumno } = req.params;

    const inscripciones = await Inscripcion.find({
      idAlumno,
    }).lean();

    res.status(200).json(inscripciones);
  } catch (error) {
    console.error("ERROR GET INSCRIPCIONES POR ALUMNO:", error);
    res.status(500).json({
      error: "Error al obtener inscripciones del alumno",
      detalle: error.message,
    });
  }
});

export default router;