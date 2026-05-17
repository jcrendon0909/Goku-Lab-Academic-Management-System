import mongoose from "mongoose";

const inscripcionSchema = new mongoose.Schema(
  {
    idAlumno: { type: String, required: true, index: true },
    nombreAlumno: { type: String, required: true },
    grupoId: { type: String, required: true, index: true },
    modalidad: { type: String, default: "Presencial" },
    // Fecha efectiva desde la cual el alumno debe aparecer en el calendario.
    // Si no se envía, se usa la fecha en que se guarda la inscripción.
    fechaInscripcion: { type: Date, default: () => new Date() }
  },
  {
    collection: "inscripciones",
    versionKey: false,
    timestamps: true
  }
);

const Inscripcion = mongoose.model("Inscripcion", inscripcionSchema);

export default Inscripcion;