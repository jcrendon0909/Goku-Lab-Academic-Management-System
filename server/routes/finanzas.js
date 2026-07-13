import express from 'express';
import Pago from '../models/Pago.js';
import Gasto from '../models/Gasto.js';
import Alumno from '../models/Alumno.js';

const router = express.Router();

// Resumen financiero
router.get('/resumen/:anio', async (req, res) => {
  try {
    const anio = parseInt(req.params.anio);
    const inicio = new Date(anio, 0, 1);
    const fin = new Date(anio, 11, 31, 23, 59, 59);

    // Ingresos totales (pagos activos en el año)
    const ingresosAgg = await Pago.aggregate([
      { $match: { activo: true, createdAt: { $gte: inicio, $lte: fin } } },
      { $group: { _id: null, total: { $sum: '$montoPago' } } }
    ]);
    const ingresos = ingresosAgg.length > 0 ? ingresosAgg[0].total : 0;

    // Gastos totales en el año
    const gastosAgg = await Gasto.aggregate([
      { $match: { fecha: { $gte: inicio, $lte: fin } } },
      { $group: { _id: null, total: { $sum: '$monto' } } }
    ]);
    const gastos = gastosAgg.length > 0 ? gastosAgg[0].total : 0;

    res.json({ ingresos, gastos, utilidad: ingresos - gastos });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;