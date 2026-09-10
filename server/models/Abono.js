import mongoose from "mongoose";

const abonoSchema = new mongoose.Schema(
  {
    abonoId: { type: String, required: true, unique: true, index: true },
    pagoId: { type: String, required: true, index: true },
    idAlumno: { type: String, required: true, index: true },
    grupoId: { type: String, required: true, index: true },
    nombreAlumno: { type: String, required: true },
    montoAbono: { type: Number, required: true, min: 0 },
    metodoAbono: { type: String, default: "Efectivo" },
    fechaAbono: { type: Date, default: Date.now },
    numeroDeabono: { type: String, default: "" },
    comprobante: { type: String, default: "" },
    notas: { type: String, default: "" },

    // ===== CAMPOS PARA DESCUENTOS Y SALDOS =====
    esDescuento: { type: Boolean, default: false },
    aplicaSaldoAFavor: { type: Boolean, default: false },
    mesesCubiertos: { type: Number, default: 1 },
    descuentoPorcentaje: { type: Number, default: 0 },
  },
  {
    collection: "abonos",
    versionKey: false,
    timestamps: true,
  }
);

// Índices compuestos (pagoId ya tiene index:true arriba, NO duplicar)
abonoSchema.index({ idAlumno: 1, grupoId: 1 });

export default mongoose.model("Abono", abonoSchema, "abonos");