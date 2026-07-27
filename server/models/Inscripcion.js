import mongoose from "mongoose";

const inscripcionSchema = new mongoose.Schema(
  {
    idAlumno: { type: String, required: true, index: true },
    nombreAlumno: { type: String, required: true },
    grupoId: { type: String, required: true, index: true },
    modalidad: { type: String, default: "Presencial" },
    montoMensualidad: { type: Number, required: true },
    diaPago: { type: Number, required: true, min: 1, max: 31 },
    fechaInicioPago: { type: Date, required: true },
    comentarios: { type: String, default: "" },
    fechaInscripcion: { type: Date, default: Date.now },
    estatus: { 
      type: String, 
      enum: ["Activa", "Inactiva", "Baja"], 
      default: "Activa" 
    },
    fechaBaja: { type: Date },
    motivoBaja: { type: String },
    // ✅ NUEVO: Historial de modificaciones
    historialModificaciones: {
      type: [{
        fecha: { type: Date, default: Date.now },
        usuario: { type: String, default: "admin" },
        cambios: { type: mongoose.Schema.Types.Mixed, default: {} }
      }],
      default: []
    },
  },
  {
    timestamps: true,
    collection: "inscripciones",
    versionKey: false,
  }
);

// Índice compuesto para evitar duplicados
inscripcionSchema.index({ idAlumno: 1, grupoId: 1 }, { unique: true });

export default mongoose.model("Inscripcion", inscripcionSchema);