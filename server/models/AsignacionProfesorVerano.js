import mongoose from "mongoose";

const asignacionProfesorVeranoSchema = new mongoose.Schema({
  idCursoVerano: { type: String, required: true, index: true },
  idProfesor: { type: String, required: true },
  dias: { type: [Number], required: true, default: [] },
  horasPorDia: { type: Number, required: true, default: 0 },
  costoHora: { type: Number, required: true, default: 0 },
  semanas: { type: Number, required: true, default: 1 },
}, { timestamps: true });

// Índice único para evitar duplicados por curso + profesor
asignacionProfesorVeranoSchema.index(
  { idCursoVerano: 1, idProfesor: 1 },
  { unique: true }
);

export default mongoose.model('AsignacionProfesorVerano', asignacionProfesorVeranoSchema);