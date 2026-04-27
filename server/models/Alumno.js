import mongoose from "mongoose";

const alumnoSchema = new mongoose.Schema(
  {
    idAlumno: { type: String, required: true, unique: true },
    nombreAlumno: { type: String, required: true },
    telefono: { type: String, default: "" },
    tutor: { type: String, default: "" },
    observaciones: { type: String, default: "" },
    estatus: { type: String, default: "Activo" }
  },
  {
    collection: "alumnos",
    timestamps: true
  }
);

const Alumno = mongoose.model("Alumno", alumnoSchema);

export default Alumno;