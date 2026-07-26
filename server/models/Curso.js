import mongoose from "mongoose";

const cursoSchema = new mongoose.Schema({
  idCurso: { type: String, required: true, unique: true, index: true },
  nombreCurso: { type: String, required: true },
  // ===== CAMPOS NUEVOS =====
  precioMensualidad: { type: Number, default: 0, min: 0 },
  duracionMeses: { type: Number, default: 1 },
  nivel: { type: String, enum: ['Básico', 'Intermedio', 'Avanzado'], default: 'Básico' },
  categoria: { type: String, default: '' },
  estatus: { type: String, enum: ["Activo", "Inactivo"], default: "Activo" },
}, { timestamps: true });

cursoSchema.index({ idCurso: 1, nombreCurso: 1 });

export default mongoose.model("Curso", cursoSchema);