import mongoose from "mongoose";

const inscripcionSchema = new mongoose.Schema(
  {
    idAlumno: { type: String, required: true, index: true },
    nombreAlumno: { type: String, required: true },
    grupoId: { type: String, required: true, index: true }
  },
  {
    collection: "inscripciones",
    versionKey: false,
    timestamps: true
  }
);

const Inscripcion = mongoose.model("Inscripcion", inscripcionSchema);

export default Inscripcion;