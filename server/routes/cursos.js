import express from "express";
import Curso from "../models/Curso.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const cursos = await Curso.find().lean();
    res.status(200).json(cursos);
  } catch (error) {
    console.error("ERROR GET CURSOS:", error);
    res.status(500).json({
      error: "Error al obtener cursos",
      detalle: error.message,
    });
  }
});

export default router;