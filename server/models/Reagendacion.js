import mongoose from "mongoose";

const reagendacionSchema = new mongoose.Schema(
  {
    ReagendacionId: { type: String, required: true, unique: true },
    idAlumno: { type: String, required: true },
    nombreAlumno: { type: String, required: true },

    IdgrupoOrigen: { type: String, required: true },
    idGrupoNuevo: { type: String, required: true },

    nombreCurso: { type: String, default: "" },

    profesorOriginal: { type: String, default: "" },
    profesorNuevo: { type: String, default: "" },

    idProfesorOriginal: { type: String, default: "" },
    idProfesorNuevo: { type: String, default: "" },

    fechaHoraOriginal: { type: String, default: "" },
    fechaHoraNueva: { type: String, default: "" },

    duracion: { type: String, default: "2 horas" },
    modalidad: { type: String, default: "Presencial" },

    motivo: { type: String, default: "Reagendado desde sistema" },
    FechaMovimiento: { type: String, default: () => new Date().toISOString() },
    estatus: { type: String, default: "reagendado" },
  },
  {
    timestamps: true,
    collection: "reagendaciones",
  }
);

export default mongoose.model("Reagendacion", reagendacionSchema);