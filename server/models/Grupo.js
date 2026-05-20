import mongoose from "mongoose";

const grupoSchema = new mongoose.Schema(
  {
    IdGrupo: { type: String, required: true, unique: true },
    idCurso: { type: String, default: "" },
    nombreCurso: { type: String, required: true },
    diaClase: { type: String, required: true },
    horaClase: { type: String, required: true },
    duracionClase: { type: String, default: "2 horas" },
    idProfesor: { type: String, default: "" },
    nombreProfesor: { type: String, required: true },
    comentario: { type: String, default: "" },
    CapacidadMaxima: { type: Number, required: true },
    Estatus: { type: String, required: true },
    fechaCreacion: { type: Date, default: () => new Date() },
  },
  {
    collection: "grupos",
    versionKey: false,
  }
);

const Grupo =
  mongoose.models.Grupo || mongoose.model("Grupo", grupoSchema);

export default Grupo;
