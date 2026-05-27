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

    // ✅ CAMBIO CRÍTICO: Fechas como Date (ISO 8601), nunca como strings
    fechaHoraOriginal: { type: Date, default: null },
    fechaHoraNueva: { type: Date, default: null },

    // ✅ NUEVO: Tipo de reagendación (temporal = una sola clase, permanente = cambio definitivo)
    tipoReagendacion: {
      type: String,
      enum: ["temporal", "permanente"],
      default: "temporal"
    },

    // ✅ NUEVO: Notificación al profesor
    notificacionProfesor: {
      enviada: { type: Boolean, default: false },
      fechaEnvio: { type: Date, default: null },
      idProfesor: { type: String, default: "" }
    },

    duracion: { type: String, default: "2 horas" },
    modalidad: { type: String, default: "Presencial" },

    motivo: { type: String, default: "Reagendado desde sistema" },
    comentario: { type: String, default: "" },
    // ✅ FechaMovimiento también como Date
    FechaMovimiento: { type: Date, default: () => new Date() },
    estatus: { type: String, enum: ["reagendado", "cancelado"], default: "reagendado" },
  },
  {
    timestamps: true,
    collection: "reagendaciones",
    versionKey: false
  }
);

// ✅ Índices para búsquedas rápidas
reagendacionSchema.index({ idAlumno: 1, idGrupoOrigen: 1 });
reagendacionSchema.index({ idGrupoNuevo: 1 });
reagendacionSchema.index({ createdAt: -1 });

export default mongoose.model("Reagendacion", reagendacionSchema);
