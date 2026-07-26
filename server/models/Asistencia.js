import mongoose from "mongoose";

const asistenciaSchema = new mongoose.Schema({
  idAlumno: { type: String, required: true, index: true },
  nombreAlumno: { type: String, required: true },
  grupoId: { type: String, required: true, index: true },
  fecha: { type: Date, required: true, index: true },
  estado: {
    type: String,
    enum: ['presente', 'ausente', 'justificado'],
    default: 'ausente'
  },
  observaciones: { type: String, default: "" },
  profesorId: { type: String, default: "" },
}, {
  timestamps: true,
  collection: 'asistencias'
});

// Índice único para evitar duplicados (un alumno no puede tener dos asistencias el mismo día en el mismo grupo)
asistenciaSchema.index({ idAlumno: 1, grupoId: 1, fecha: 1 }, { unique: true });

export default mongoose.model('Asistencia', asistenciaSchema);