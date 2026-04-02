import mongoose from "mongoose";

const inscripcionSchema = new mongoose.Schema(
  {
    idAlumno: { type: String, required: true },
    nombreAlumno: { type: String, required: true },
    grupoId: { type: String, required: true }
  },
  {
    collection: "inscripciones",
    versionKey: false
  }
);

const Inscripcion = mongoose.model("Inscripcion", inscripcionSchema);

export default Inscripcion;