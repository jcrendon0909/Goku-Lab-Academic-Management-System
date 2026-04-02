import express from "express";
import Inscripcion from "../models/Inscripcion.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const inscripciones = await Inscripcion.find();
    res.json(inscripciones);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener inscripciones" });
  }
});

export default router;