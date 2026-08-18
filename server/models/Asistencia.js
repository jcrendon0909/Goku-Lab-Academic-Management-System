import mongoose from 'mongoose';

const asistenciaSchema = new mongoose.Schema(
  {
    idAlumno: { type: String, required: true, index: true },
    idGrupo: { type: String, required: true, index: true },
    idProfesor: { type: String, required: true, index: true },
    fecha: { type: Date, required: true, index: true },
    estado: {
      type: String,
      enum: ['presente', 'ausente', 'justificado', 'retardo'],
      default: 'ausente',
    },
    comentario: { type: String, default: '' },
    horaInicio: { type: String, default: '' },
    horaFin: { type: String, default: '' },
  },
  {
    timestamps: true,
    collection: 'asistencias',
    versionKey: false,
  }
);

asistenciaSchema.index({ idAlumno: 1, fecha: 1 });
asistenciaSchema.index({ idGrupo: 1, fecha: 1 });

export default mongoose.model('Asistencia', asistenciaSchema);