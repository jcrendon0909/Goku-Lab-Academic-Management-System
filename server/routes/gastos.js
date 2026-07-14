import express from "express";
import Gasto from "../models/Gasto.js";

const router = express.Router();

// Obtener gastos con filtros
router.get("/", async (req, res) => {
  try {
    const { mes, anio, categoria } = req.query;
    const filtro = {};
    if (mes) filtro.mes = mes;
    if (anio) filtro.anio = parseInt(anio);
    if (categoria) filtro.categoria = categoria;

    const gastos = await Gasto.find(filtro).sort({ fecha: -1 });
    res.json(gastos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Crear un nuevo gasto
router.post("/", async (req, res) => {
  try {
    const nuevoGasto = new Gasto(req.body);
    await nuevoGasto.save();
    res.status(201).json(nuevoGasto);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Actualizar un gasto
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const gastoActualizado = await Gasto.findByIdAndUpdate(
      id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!gastoActualizado) {
      return res.status(404).json({ error: "Gasto no encontrado" });
    }
    res.json(gastoActualizado);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Eliminar un gasto
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const gastoEliminado = await Gasto.findByIdAndDelete(id);
    if (!gastoEliminado) {
      return res.status(404).json({ error: "Gasto no encontrado" });
    }
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;