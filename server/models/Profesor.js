import mongoose from "mongoose";

const profesorSchema = new mongoose.Schema(
  {
    idProfesor: { type: String, required: true, unique: true },
    nombre: { type: String, required: true },
    estatus: { type: String, default: "Activo" },
    fechaNacimiento: {
      type: Date,
      required: false,
      default: null
    },
    // Pago por hora (existente)
    salarioPorHora: {
      type: Number,
      required: false,
      min: 0,
      default: 0
    },
    // ===== NUEVOS CAMPOS PARA PAGO FIJO =====
    tipoPago: {
      type: String,
      enum: ['por_hora', 'fijo_mensual'],
      default: 'por_hora'
    },
    salarioMensual: {
      type: Number,
      required: false,
      min: 0,
      default: 0
    }
  },
  {
    collection: "profesores",
  }
);

const Profesor = mongoose.model("Profesor", profesorSchema);
export default Profesor;