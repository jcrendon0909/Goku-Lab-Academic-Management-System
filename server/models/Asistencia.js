import mongoose from 'mongoose';

const asistenciaSchema = new mongoose.Schema(
  {
    // ===== Identificación =====
    idAlumno: { type: String, required: true, index: true },
    idGrupo: { type: String, required: true, index: true },
    idProfesor: { type: String, required: true, index: true },
    fecha: { type: Date, required: true, index: true },

    // ===== Estado del alumno =====
    estado: {
      type: String,
      enum: ['presente', 'ausente', 'justificado', 'retardo', 'reagendado', 'pendiente'],
      default: 'ausente',
    },
    comentario: { type: String, default: '' },
    horaInicio: { type: String, default: '' },
    horaFin: { type: String, default: '' },

    // ===== NUEVOS CAMPOS =====
    // Link a la sesión (clase) a la que pertenece esta asistencia
    idSesion: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SesionClase',
      default: null,
      index: true,
    },
    // ¿Fue una asistencia regular a su grupo, o a una clase reagendada?
    tipoRegistro: {
      type: String,
      enum: ['regular', 'reagendacion'],
      default: 'regular',
      index: true,
    },
    // Si tipoRegistro='reagendacion', aquí va el grupo "de casa" del alumno
    idGrupoRegular: { type: String, default: '' },
    // Si tipoRegistro='reagendacion', aquí va el ID de la Reagendacion
    idReagendacion: { type: String, default: '' },
    // Quién registró/actualizó esta asistencia
    registradoPor: { type: String, default: '' },
  },
  {
    timestamps: true,
    collection: 'asistencias',
    versionKey: false,
  }
);

// ===== Índices =====
asistenciaSchema.index({ idAlumno: 1, fecha: 1 });
asistenciaSchema.index({ idGrupo: 1, fecha: 1 });
asistenciaSchema.index({ idSesion: 1 });
asistenciaSchema.index({ idAlumno: 1, tipoRegistro: 1, fecha: -1 });
// Índice NO único por ahora (evita romper datos históricos).
// Después de correr el script de migración, se puede volver único.
asistenciaSchema.index({ idAlumno: 1, idGrupo: 1, fecha: 1 });

export default mongoose.model('Asistencia', asistenciaSchema);