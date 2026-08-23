import mongoose from 'mongoose';

const pagoSchema = new mongoose.Schema(
    {
        // ===== CAMPOS EXISTENTES (se mantienen) =====
        pagoId: { type: String, required: true, unique: true, index: true },
        idAlumno: { type: String, default: "", index: true },
        grupoId: { type: String, default: "", index: true },
        nombreAlumno: { type: String, required: true },
        nombreCurso: { type: String, required: true },
        diaPago: { type: Number, required: true, min: 1, max: 31 },
        montoPago: { type: Number, required: true },
        fechaInicioPago: { type: Date, default: Date.now },
        activo: { type: Boolean, default: true, index: true },
        fechaBaja: { type: Date, default: null },

        mesCorrespondiente: { type: String },
        periodo: { type: String, default: "Mes" },
        anio: { type: Number },

        fechaPago: { type: Date, default: Date.now },
        metodoPago: { type: String, default: 'Efectivo' },
        estatus: { type: String, enum: ['Pagado', 'Pendiente', 'Parcial', 'Cancelado'], default: 'Pagado' },
        notas: { type: String, default: '' },
        facturaRequerida: { type: Boolean, default: false },
        facturaEmitida: { type: Boolean, default: false },
        folioFactura: { type: String, default: '' },

        // ===== NUEVOS CAMPOS PARA DESCUENTOS Y SALDOS =====
        descuentoAplicado: { type: Number, default: 0, min: 0, max: 100 }, // % de descuento
        mesesCubiertos: { type: Number, default: 1, min: 1 }, // Para pagos adelantados
        tipoPago: { 
            type: String, 
            enum: ['normal', 'adelantado', 'descuento'], 
            default: 'normal' 
        },
        saldoAFavor: { type: Number, default: 0 }, // Excedente de este pago (para próximos meses)
        fechaFinCobertura: { type: Date, default: null }, // Hasta cuándo está pagado (para adelantados)
    },
    {
        collection: 'pago',
        versionKey: false,
        timestamps: true,
    }
);

// Índices adicionales
pagoSchema.index({ idAlumno: 1, anio: 1, mesCorrespondiente: 1 });
pagoSchema.index({ grupoId: 1, anio: 1 });

export default mongoose.model('Pago', pagoSchema, 'pago');