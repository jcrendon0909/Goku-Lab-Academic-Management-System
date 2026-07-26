import mongoose from "mongoose";

const cursoVeranoSchema = new mongoose.Schema({
  idCursoVerano: { type: String, required: true, unique: true },
  nombre: { type: String, required: true },
  modalidad: { type: String, enum: ['verano', 'preverano'], default: 'verano' },
  año: { type: Number, required: true },
  fechaInicio: { type: Date, required: true },
  fechaFin: { type: Date, required: true },
  descripcion: { type: String, default: "" },
  estatus: { type: String, enum: ['activo', 'finalizado', 'cancelado'], default: 'activo' },
  profesorPrincipal: { type: String, default: "" },
}, { timestamps: true });

export default mongoose.model('CursoVerano', cursoVeranoSchema);