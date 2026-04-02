import mongoose from "mongoose";

const reagendacionSchema = new mongoose.Schema(
  {
    _id:{ type: String, required: true },
    ReagendacionId: { type: String, required: true },
    idAlumno: { type: String, required: true },
    nombreAlumno: { type: String, required: true },
    IdgrupoOrigen: { type: String, required: true },
    idGrupoNuevo: { type: String, required: false },
    nombreCurso: { type: String, required: true },
    profesorOriginal: { type: String, required: false },
    profesorNuevo: { type: String, required: false },
    fechaHoraOriginal: { type: String, required: true },
    fechaHoraNueva: { type: String, required: true },
    motivo: { type: String, required: true },
    FechaMovimiento: { type: String, required: true },
    estatus: { type: String, required: true }
  },
  {
    collection: "reagendaciones",
    versionKey: false
  }
);

const Reagendacion = mongoose.model("Reagendacion", reagendacionSchema);

export default Reagendacion;