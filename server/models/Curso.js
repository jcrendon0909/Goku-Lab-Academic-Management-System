import mongoose from "mongoose";

const cursoSchema = new mongoose.Schema(
  {
    idCurso: { type: String, required: true, unique: true },
    nombreCurso: { type: String, required: true },
    estatus: { type: String, default: "Activo" },
  },
  {
    collection: "cursos",
    versionKey: false,
  }
);

const Curso = mongoose.model("Curso", cursoSchema);

export default Curso;