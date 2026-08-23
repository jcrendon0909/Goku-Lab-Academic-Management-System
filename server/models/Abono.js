import mongoose from "mongoose";

const abonoSchema = new mongoose.Schema(
    {
        abonoId: { type: String, required: true, unique: true, index: true },
        pagoId: { type: String, required: true, index: true },
        idAlumno: { type: String, required: true, index: true },
        grupoId: { type: String, required: true, index: true },
        nombreAlumno: { type: String, required: true },
        montoAbono: { type: Number, required: true, min: 0 },
        metodoAbono: { type: String, default: 'Efectivo' },
        fechaAbono: { type: Date, default: Date.now },
        numeroDeabono: { type: String, default: '' },
        comprobante: { type: String, default: '' },
        notas: { type: String, default: '' },

        // ===== NUEVOS CAMPOS PARA DESCUENTOS Y SALDOS =====
        esDescuento: { type: Boolean, default: false }, // Si este abono es un descuento aplicado
        aplicaSaldoAFavor: { type: Boolean, default: false }, // Si este abono genera saldo a favor
        mesesCubiertos: { type: Number, default: 1 }, // Si este abono cubre varios meses
        descuentoPorcentaje: { type: Number, default: 0 }, // Si es un descuento, qué % se aplicó
    },
    {
        collection: 'abonos',
        versionKey: false,
        timestamps: true,
    }
);

abonoSchema.index({ idAlumno: 1, grupoId: 1 });
abonoSchema.index({ pagoId: 1 });

export default mongoose.model('Abono', abonoSchema, 'abonos');