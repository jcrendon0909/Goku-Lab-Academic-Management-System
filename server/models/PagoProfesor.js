import mongoose from 'mongoose';

const pagoProfesorSchema = new mongoose.Schema(
  {
    idProfesor: { type: String, required: true, index: true },
    nombreProfesor: { type: String, required: true },
    tipoPago: { type: String, enum: ['por_hora', 'fijo_mensual'], required: true },
    salarioPorHora: { type: Number, default: 0 },
    salarioMensual: { type: Number, default: 0 },

    // Datos del pago
    fecha: { type: Date, default: Date.now },
    horasTrabajadas: { type: Number, default: 0 },
    montoCalculado: { type: Number, required: true },
    metodoPago: { type: String, default: 'Efectivo' },
    observaciones: { type: String, default: '' },

    // Control
    creadoPor: { type: String, default: 'admin' },
    activo: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    collection: 'pagos_profesores',
    versionKey: false,
  }
);

pagoProfesorSchema.index({ idProfesor: 1, fecha: -1 });

export default mongoose.model('PagoProfesor', pagoProfesorSchema);