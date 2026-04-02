import express from "express";
import Grupo from "../models/Grupo.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const grupos = await Grupo.find();
    res.json(grupos);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener grupos" });
  }
});

export default router;