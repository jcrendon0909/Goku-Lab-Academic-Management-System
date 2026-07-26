import mongoose from "mongoose";

const registroHorasProfesorVeranoSchema = new mongoose.Schema({
  idCursoVerano: { type: String, required: true, index: true },
  idProfesor: { type: String, required: true },
  fecha: { type: Date, required: true },
  horas: { type: Number, required: true },
  observaciones: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('RegistroHorasProfesorVerano', registroHorasProfesorVeranoSchema);