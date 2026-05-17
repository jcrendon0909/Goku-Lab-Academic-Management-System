import mongoose from 'mongoose';

const pagoSchema = new mongoose.Schema(
    {
        pagoId: { type: String, required: true, unique: true, index: true },
        idAlumno: { type: String, default: "", index: true },
        grupoId: { type: String, default: "", index: true },
        nombreAlumno: { type: String, required: true },
        nombreCurso: { type: String, required: true },
        diaPagoFijo: { type: Number, required: true },
        montoPago: { type: Number, required: true },
        fechaPago: { type: Date, default: null },
        activo: { type: Boolean, default: true, index: true },
        fechaBaja: { type: Date, default: null },
    },
    {
        collection: 'pago',
        versionKey: false,
        timestamps: true,
    }
);

export default mongoose.model('Pago', pagoSchema, 'pago');
