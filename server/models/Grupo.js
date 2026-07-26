import mongoose from "mongoose";

const grupoSchema = new mongoose.Schema({
  IdGrupo: { type: String, required: true, unique: true, index: true },
  idCurso: { type: String, required: true, index: true },
  nombreCurso: { type: String, required: true },
  diaClase: { type: String, required: true },
  horaClase: { type: String, required: true },
  duracionClase: { type: String, default: "1:30 hr" },
  idProfesor: { type: String, index: true },
  nombreProfesor: { type: String, default: "" },
  // ===== CAMPOS NUEVOS =====
  precioMensualidad: { type: Number, default: 0 },
  fechaInicio: { type: Date, default: null },
  fechaFin: { type: Date, default: null },
  salon: { type: String, default: "" },
  // ===== CAMPOS EXISTENTES =====
  comentario: { type: String, default: "" },
  CapacidadMaxima: { type: Number, default: 8 },
  Estatus: { type: String, enum: ["Activo", "Inactivo"], default: "Activo" },
  fechaCreacion: { type: Date, default: Date.now },
}, { timestamps: true });

grupoSchema.index({ IdGrupo: 1, idProfesor: 1 });

export default mongoose.model("Grupo", grupoSchema);