import mongoose from "mongoose";

const profesorSchema = new mongoose.Schema({
  idProfesor: { type: String, required: true, unique: true },
  nombre: { type: String, required: true },
  telefono: { type: String, default: "" },
  email: { type: String, default: "" },
  fechaNacimiento: { type: Date, default: null },
  tipoPago: { type: String, enum: ['por_hora', 'fijo_mensual'], default: 'fijo_mensual' },
  salarioPorHora: { type: Number, default: 0 },
  salarioMensual: { type: Number, default: 0 },
  estatus: { type: String, enum: ['Activo', 'Inactivo'], default: 'Activo' },
}, { 
  timestamps: true,
  collection: 'profesores' // 👈 FORZAR EL NOMBRE DE LA COLECCIÓN
});

export default mongoose.model('Profesor', profesorSchema);