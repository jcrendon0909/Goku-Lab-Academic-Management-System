import express from "express";
import Gasto from "../models/Gasto.js";
import { mesAnioDesdeFecha } from "../utils/periodos.js";

const router = express.Router();

// ============================================================
// GET /gastos — Lista con filtros (excluye eliminados por defecto)
// ============================================================
router.get("/", async (req, res) => {
  try {
    const { mes, anio, categoria, incluirEliminados } = req.query;
    const filtro = {};

    // Por defecto solo activos (soft-delete)
    if (incluirEliminados !== "true") {
      filtro.activo = { $ne: false };
    }
    if (mes) filtro.mes = mes;
    if (anio) filtro.anio = parseInt(anio);
    if (categoria) filtro.categoria = categoria;

    const gastos = await Gasto.find(filtro).sort({ fecha: -1 });
    res.json(gastos);
  } catch (error) {
    console.error("Error GET /gastos:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// POST /gastos — Crear (mes/anio se derivan de fecha)
// ============================================================
router.post("/", async (req, res) => {
  try {
    const { fecha, mes, anio, ...resto } = req.body; // ignoramos mes/anio del cliente
    const fechaObj = fecha ? new Date(fecha) : new Date();
    if (isNaN(fechaObj.getTime())) {
      return res.status(400).json({ error: "Fecha inválida" });
    }
    const derivado = mesAnioDesdeFecha(fechaObj);

    const nuevoGasto = new Gasto({
      ...resto,
      fecha: fechaObj,
      mes: derivado.mes,
      anio: derivado.anio,
      activo: true,
      creadoPor: req.user?.usuario || "admin",
    });
    await nuevoGasto.save();
    res.status(201).json(nuevoGasto);
  } catch (error) {
    console.error("Error POST /gastos:", error);
    res.status(400).json({ error: error.message });
  }
});

// ============================================================
// PUT /gastos/:id — Actualizar (mes/anio se re-derivan si cambia fecha)
// ============================================================
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { fecha, mes, anio, ...resto } = req.body; // ignoramos mes/anio del cliente

    const update = { ...resto };
    if (fecha) {
      const fechaObj = new Date(fecha);
      if (isNaN(fechaObj.getTime())) {
        return res.status(400).json({ error: "Fecha inválida" });
      }
      const derivado = mesAnioDesdeFecha(fechaObj);
      update.fecha = fechaObj;
      update.mes = derivado.mes;
      update.anio = derivado.anio;
    }

    const gastoActualizado = await Gasto.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    });
    if (!gastoActualizado) {
      return res.status(404).json({ error: "Gasto no encontrado" });
    }
    res.json(gastoActualizado);
  } catch (error) {
    console.error("Error PUT /gastos/:id:", error);
    res.status(400).json({ error: error.message });
  }
});

// ============================================================
// DELETE /gastos/:id — Soft delete (nunca borrado físico)
// ============================================================
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const gastoEliminado = await Gasto.findByIdAndUpdate(
      id,
      {
        activo: false,
        eliminadoPor: req.user?.usuario || "admin",
        fechaEliminacion: new Date(),
      },
      { new: true }
    );
    if (!gastoEliminado) {
      return res.status(404).json({ error: "Gasto no encontrado" });
    }
    res.json({ ok: true, gasto: gastoEliminado });
  } catch (error) {
    console.error("Error DELETE /gastos/:id:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// PATCH /gastos/:id/restaurar — Revertir soft delete
// ============================================================
router.patch("/:id/restaurar", async (req, res) => {
  try {
    const { id } = req.params;
    const gasto = await Gasto.findByIdAndUpdate(
      id,
      { activo: true, eliminadoPor: null, fechaEliminacion: null },
      { new: true }
    );
    if (!gasto) {
      return res.status(404).json({ error: "Gasto no encontrado" });
    }
    res.json(gasto);
  } catch (error) {
    console.error("Error PATCH /gastos/:id/restaurar:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;