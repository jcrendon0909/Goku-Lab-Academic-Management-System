import mongoose from "mongoose";

const alumnoSchema = new mongoose.Schema(
  {
    // --- Campos existentes (NO modificar) ---
    idAlumno: { type: String, required: true, unique: true },
    nombreAlumno: { type: String, required: true },
    telefono: { type: String, default: "" },
    tutor: { type: String, default: "" },
    observaciones: { type: String, default: "" },
    estatus: { type: String, default: "Activo" },
    saldoAFavor: { type: Number, default: 0 },

    // --- NUEVOS CAMPOS (opcionales, no rompen nada) ---
    // Coinciden con tu hoja "Control de Alumnos Fusión"
    origen: {
      type: String,
      enum: ['Naucalpan', 'Satélite', 'Otro'],
      default: 'Naucalpan'
    },
    situacionPercibida: {
      type: String,
      enum: ['Estable', 'Dudoso', 'Salida', 'Terminó curso', ''],
      default: 'Estable'
    }
  },
  {
    collection: "alumnos",
    timestamps: true
  }
);

// Índices para mejorar el rendimiento en reportes
alumnoSchema.index({ origen: 1 });
alumnoSchema.index({ situacionPercibida: 1 });
alumnoSchema.index({ fechaProximoPago: 1 });

const Alumno = mongoose.model("Alumno", alumnoSchema);

export default Alumno;