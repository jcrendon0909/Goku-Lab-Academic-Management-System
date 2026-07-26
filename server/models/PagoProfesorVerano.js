import mongoose from "mongoose";

const pagoProfesorVeranoSchema = new mongoose.Schema({
  idCursoVerano: { type: String, required: true, index: true },
  idProfesor: { type: String, required: true },
  montoTotal: { type: Number, required: true },
  periodo: { type: String, required: true },
  pagado: { type: Boolean, default: false },
  fechaPago: { type: Date, default: null },
}, { timestamps: true });

export default mongoose.model('PagoProfesorVerano', pagoProfesorVeranoSchema);