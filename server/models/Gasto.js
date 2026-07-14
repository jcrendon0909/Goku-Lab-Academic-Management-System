import mongoose from "mongoose";

const gastoSchema = new mongoose.Schema(
  {
    categoria: {
      type: String,
      enum: [
        "Renta",
        "Luz",
        "Agua",
        "Limpieza",
        "Internet",
        "Celular",
        "Insumos",
        "Adecuaciones",
        "Regalias Algorithmics",
        "Agencia de Publicidad",
        "Publicidad Meta",
        "Marco",
        "Profesores",
        "Kommo",
        "Zadarma",
        "Comisiones",
        "Otro"
      ],
      required: true,
      index: true
    },
    concepto: { type: String, required: true },
    monto: { type: Number, required: true, min: 0 },
    fecha: { type: Date, required: true, default: Date.now },
    mes: {
      type: String,
      enum: ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"],
      required: true
    },
    anio: {
      type: Number,
      required: true,
      default: () => new Date().getFullYear(),
      index: true
    },
    comprobante: {
      type: String,
      default: ""
    },
    observaciones: { type: String, default: "" }
  },
  {
    collection: "gastos",
    timestamps: true
  }
);

gastoSchema.index({ anio: 1, mes: 1, categoria: 1 });

const Gasto = mongoose.model("Gasto", gastoSchema);
export default Gasto;