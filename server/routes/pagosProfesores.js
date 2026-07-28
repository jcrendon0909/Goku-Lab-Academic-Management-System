import express from 'express';
import PagoProfesor from '../models/PagoProfesor.js';
import Profesor from '../models/Profesor.js';

const router = express.Router();

// GET / - Obtener todos los pagos (con filtros opcionales)
router.get('/', async (req, res) => {
  try {
    const { idProfesor, desde, hasta } = req.query;
    const filtro = {};
    if (idProfesor) filtro.idProfesor = idProfesor;
    if (desde || hasta) {
      filtro.fecha = {};
      if (desde) filtro.fecha.$gte = new Date(desde);
      if (hasta) filtro.fecha.$lte = new Date(hasta);
    }
    const pagos = await PagoProfesor.find(filtro).sort({ fecha: -1 }).lean();
    res.json(pagos);
  } catch (error) {
    console.error('❌ GET /pagos-profesores:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST / - Crear un pago (con cálculo automático)
router.post('/', async (req, res) => {
  try {
    const { idProfesor, fecha, horasTrabajadas, metodoPago, observaciones } = req.body;

    // Obtener datos del profesor
    const profesor = await Profesor.findOne({ idProfesor }).lean();
    if (!profesor) {
      return res.status(404).json({ error: 'Profesor no encontrado' });
    }

    // Calcular monto automáticamente
    let montoCalculado = 0;
    let tipoPago = profesor.tipoPago || 'fijo_mensual';

    if (tipoPago === 'por_hora') {
      const salarioPorHora = Number(profesor.salarioPorHora) || 0;
      montoCalculado = (Number(horasTrabajadas) || 0) * salarioPorHora;
    } else {
      // fijo_mensual: se calcula proporcional a semanas trabajadas (1 semana = 1/4 del salario mensual)
      const salarioMensual = Number(profesor.salarioMensual) || 0;
      const semanas = Number(horasTrabajadas) || 1; // si no se especifica, se asume 1 semana
      montoCalculado = (salarioMensual / 4) * semanas;
    }

    const nuevoPago = new PagoProfesor({
      idProfesor,
      nombreProfesor: profesor.nombre,
      tipoPago,
      salarioPorHora: profesor.salarioPorHora || 0,
      salarioMensual: profesor.salarioMensual || 0,
      fecha: fecha || new Date(),
      horasTrabajadas: Number(horasTrabajadas) || 0,
      montoCalculado,
      metodoPago: metodoPago || 'Efectivo',
      observaciones: observaciones || '',
      creadoPor: req.user?.usuario || 'admin',
    });

    await nuevoPago.save();
    res.status(201).json(nuevoPago);
  } catch (error) {
    console.error('❌ POST /pagos-profesores:', error);
    res.status(500).json({ error: error.message });
  }
});

// PATCH /:id - Editar pago (recalcula si cambian horas o datos)
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { fecha, horasTrabajadas, metodoPago, observaciones } = req.body;

    const pago = await PagoProfesor.findById(id);
    if (!pago) {
      return res.status(404).json({ error: 'Pago no encontrado' });
    }

    // Si se actualizan horas, recalcular monto
    let montoCalculado = pago.montoCalculado;
    if (horasTrabajadas !== undefined) {
      const horas = Number(horasTrabajadas) || 0;
      if (pago.tipoPago === 'por_hora') {
        montoCalculado = horas * (pago.salarioPorHora || 0);
      } else {
        const semanas = horas || 1;
        montoCalculado = (pago.salarioMensual / 4) * semanas;
      }
    }

    pago.fecha = fecha || pago.fecha;
    pago.horasTrabajadas = Number(horasTrabajadas) || pago.horasTrabajadas;
    pago.montoCalculado = montoCalculado;
    if (metodoPago) pago.metodoPago = metodoPago;
    if (observaciones !== undefined) pago.observaciones = observaciones;
    pago.updatedAt = new Date();

    await pago.save();
    res.json(pago);
  } catch (error) {
    console.error('❌ PATCH /pagos-profesores/:id:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /:id - Eliminar pago (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const pago = await PagoProfesor.findByIdAndUpdate(
      id,
      { activo: false, updatedAt: new Date() },
      { new: true }
    );
    if (!pago) {
      return res.status(404).json({ error: 'Pago no encontrado' });
    }
    res.json({ ok: true, mensaje: 'Pago eliminado' });
  } catch (error) {
    console.error('❌ DELETE /pagos-profesores/:id:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;