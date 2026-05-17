import express from "express";
import Profesor from "../models/Profesor.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const profesores = await Profesor.find().lean();
    res.status(200).json(profesores);
  } catch (error) {
    console.error("ERROR GET PROFESORES:", error);
    res.status(500).json({
      error: "Error al obtener profesores",
      detalle: error.message,
    });
  }
});

export default router;