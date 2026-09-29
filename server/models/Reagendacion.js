import mongoose from "mongoose";

const reagendacionSchema = new mongoose.Schema(
  {
    ReagendacionId: { type: String, required: true, unique: true },
    idAlumno: { type: String, required: true, index: true },
    nombreAlumno: { type: String, required: true },

    // ✅ Normalizado: idGrupoOrigen (antes era IdgrupoOrigen)
    idGrupoOrigen: { type: String, required: true, index: true },
    idGrupoNuevo: { type: String, required: true },

    nombreCurso: { type: String, default: "" },

    profesorOriginal: { type: String, default: "" },
    profesorNuevo: { type: String, default: "" },

    idProfesorOriginal: { type: String, default: "" },
    idProfesorNuevo: { type: String, default: "" },

    // ✅ Fechas como Date (ISO 8601), nunca como strings
    fechaHoraOriginal: { type: Date, default: null },
    fechaHoraNueva: { type: Date, default: null },

    // ✅ Tipo de reagendación
    tipoReagendacion: {
      type: String,
      enum: ["temporal", "permanente"],
      default: "temporal",
    },

    // ✅ Notificación al profesor
    notificacionProfesor: {
      enviada: { type: Boolean, default: false },
      fechaEnvio: { type: Date, default: null },
      idProfesor: { type: String, default: "" },
    },

    duracion: { type: String, default: "2 horas" },
    modalidad: { type: String, default: "Presencial" },

    motivo: { type: String, default: "Reagendado desde sistema" },
    comentario: { type: String, default: "" },
    FechaMovimiento: { type: Date, default: () => new Date() },
    estatus: {
      type: String,
      enum: ["reagendado", "cancelado"],
      default: "reagendado",
    },

    // ===== NUEVOS: vínculo con SesionClase =====
    // Sesión original de la que sale el alumno (para marcar 'reagendado' allí)
    idSesionOrigen: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SesionClase",
      default: null,
      index: true,
    },
    // Sesión nueva (el grupo prestado en la fecha nueva)
    idSesionDestino: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SesionClase",
      default: null,
      index: true,
    },
    // ¿Ya sabemos si el alumno asistió a la nueva?
    asistioAlDestino: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    collection: "reagendaciones",
    versionKey: false,
  }
);

reagendacionSchema.index({ idAlumno: 1, idGrupoOrigen: 1 });
reagendacionSchema.index({ idGrupoNuevo: 1 });
reagendacionSchema.index({ createdAt: -1 });
reagendacionSchema.index({ idProfesorNuevo: 1, fechaHoraNueva: 1 });

export default mongoose.model("Reagendacion", reagendacionSchema);