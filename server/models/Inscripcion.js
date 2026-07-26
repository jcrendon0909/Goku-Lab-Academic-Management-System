import mongoose from "mongoose";

const inscripcionSchema = new mongoose.Schema({
  idAlumno: { type: String, required: true, index: true },
  nombreAlumno: { type: String, required: true },
  grupoId: { type: String, required: true, index: true },
  modalidad: { type: String, enum: ["Presencial", "Virtual"], default: "Presencial" },
  montoMensualidad: { type: Number, required: true, min: 0 },
  diaPago: { type: Number, required: true, min: 1, max: 31 },
  fechaInicioPago: { type: Date, required: true },
  comentarios: { type: String, default: "" },
  metodoPagoPreferido: { type: String, default: "" },
  fechaProximoPago: { type: Date, default: null },
  fechaInscripcion: { type: Date, default: Date.now },
  estatus: { type: String, enum: ["Activa", "Baja", "Suspendida"], default: "Activa" },
  fechaBaja: { type: Date, default: null },
  motivoBaja: { type: String, default: "" },
}, { 
  collection: "inscripciones", // 👈 CORREGIDO
  timestamps: true 
});

inscripcionSchema.index({ idAlumno: 1, grupoId: 1, estatus: 1 });

export default mongoose.model("Inscripcion", inscripcionSchema);