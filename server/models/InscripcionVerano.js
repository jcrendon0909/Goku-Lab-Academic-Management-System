import mongoose from "mongoose";

const inscripcionVeranoSchema = new mongoose.Schema({
  idCursoVerano: { type: String, required: true, index: true },
  idAlumno: { type: String, required: true },
  nombreAlumno: { type: String, required: true },
  montoPago: { type: Number, required: true },
  semanasPagadas: { type: Number, required: true, min: 1, max: 12 },
  fechaInicio: { type: Date, required: true },
  fechaFin: { type: Date, required: true },
  notas: { type: String, default: "" },
}, { timestamps: true });

export default mongoose.model('InscripcionVerano', inscripcionVeranoSchema);