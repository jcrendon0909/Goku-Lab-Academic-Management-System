import mongoose from "mongoose";

const alumnoSchema = new mongoose.Schema(
  {
    // ===== CAMPOS EXISTENTES (se mantienen) =====
    idAlumno: { type: String, required: true, unique: true },
    nombreAlumno: { type: String, required: true },
    telefono: { type: String, default: "" },
    tutor: { type: String, default: "" },
    observaciones: { type: String, default: "" },
    estatus: { type: String, default: "Activo" },
    saldoAFavor: { type: Number, default: 0 },

    origen: {
      type: String,
      enum: ["Naucalpan", "Satélite", "Otro"],
      default: "Naucalpan"
    },
    situacion_percibida: {
      type: String,
      enum: ["Estable", "Dudoso", "Salida", "Terminó curso"],
      default: "Estable"
    },

    // ===== NUEVOS CAMPOS (agregados sin afectar los existentes) =====
    email: { type: String, default: "" },
    fechaNacimiento: { type: Date, default: null },
    descuento: { type: Number, default: 0, min: 0, max: 100 },
    notasInternas: { type: String, default: "" },
  },
  {
    collection: "alumnos",
    timestamps: true
  }
);

// ===== ÍNDICES ADICIONALES (para búsquedas rápidas) =====
alumnoSchema.index({ email: 1 });
alumnoSchema.index({ nombreAlumno: 1 }); // útil para búsquedas por nombre

const Alumno = mongoose.model("Alumno", alumnoSchema);
export default Alumno;