import mongoose from "mongoose";

const inscripcionSchema = new mongoose.Schema(
  {
    idAlumno: { type: String, required: true, index: true },
    nombreAlumno: { type: String, required: true },
    grupoId: { type: String, required: true, index: true },
    modalidad: { type: String, default: "Presencial" },
    montoMensualidad: { type: Number, default: null },
    fechaPago: { type: Date, default: null },
    diaPagoFijo: { type: Number, default: null },
    comentarios: { type: String, default: "" },
    // Fecha efectiva desde la cual el alumno debe aparecer en el calendario.
    // Si no se envía, se usa la fecha en que se guarda la inscripción.
    // ✅ SIEMPRE es Date (ISO 8601), nunca string
    fechaInscripcion: { 
      type: Date, 
      required: true,
      default: () => new Date()
    }
  },
  {
    collection: "inscripciones",
    versionKey: false,
    timestamps: true
  }
);

// Índice para búsquedas por fechaInscripcion
inscripcionSchema.index({ grupoId: 1, fechaInscripcion: 1 });

const Inscripcion = mongoose.model("Inscripcion", inscripcionSchema);

export default Inscripcion;
