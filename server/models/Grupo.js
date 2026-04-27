import mongoose from "mongoose";

const grupoSchema = new mongoose.Schema(
  {
    IdGrupo: { type: String, required: true, unique: true },
    idCurso: { type: String, default: "" },
    nombreCurso: { type: String, required: true },
    diaClase: { type: String, required: true },
    horaClase: { type: String, required: true },
    idProfesor: { type: String, default: "" },
    nombreProfesor: { type: String, required: true },
    modalidad: { type: String, required: true },
    CapacidadMaxima: { type: Number, required: true },
    Estatus: { type: String, required: true },
  },
  {
    collection: "grupos",
    versionKey: false,
  }
);

const Grupo =
  mongoose.models.Grupo || mongoose.model("Grupo", grupoSchema);

export default Grupo;