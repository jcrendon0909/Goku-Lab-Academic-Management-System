import mongoose from "mongoose";
import { MESES_LABEL } from "../utils/periodos.js";

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
        // ⚠️ NO USAR: la nómina de profesores se registra únicamente en `pagos_profesores`
        // (modelo PagoProfesor). El reporte de rentabilidad global EXCLUYE esta categoría
        // del total de gastos operativos para evitar doble conteo.
        // Se mantiene en el enum por compatibilidad con datos históricos.
        "Profesores",
        "Kommo",
        "Zadarma",
        "Comisiones",
        "Otro",
      ],
      required: true,
      index: true,
    },
    concepto: { type: String, required: true },
    monto: { type: Number, required: true, min: 0 },
    fecha: { type: Date, required: true, default: Date.now },

    // ⚠️ `mes` y `anio` se derivan SIEMPRE de `fecha` en el backend (ver routes/gastos.js).
    // Se mantienen en el schema por compatibilidad con datos existentes y por el índice compuesto.
    mes: {
      type: String,
      enum: MESES_LABEL,
      required: true,
    },
    anio: {
      type: Number,
      required: true,
      default: () => new Date().getFullYear(),
      index: true,
    },

    comprobante: { type: String, default: "" },
    observaciones: { type: String, default: "" },

    // ===== SOFT-DELETE =====
    // Los gastos NUNCA se borran físicamente (auditoría financiera).
    activo: { type: Boolean, default: true, index: true },
    creadoPor: { type: String, default: "admin" },
    eliminadoPor: { type: String, default: null },
    fechaEliminacion: { type: Date, default: null },
  },
  {
    collection: "gastos",
    timestamps: true,
  }
);

gastoSchema.index({ anio: 1, mes: 1, categoria: 1 });
gastoSchema.index({ activo: 1, fecha: -1 });

const Gasto = mongoose.model("Gasto", gastoSchema);
export default Gasto;