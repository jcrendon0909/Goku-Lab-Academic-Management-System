import mongoose from 'mongoose';

const pagoSchema = new mongoose.Schema(
    {
        pagoId: { type: String, required: true, unique: true, index: true },
        idAlumno: { type: String, default: "", index: true },
        grupoId: { type: String, default: "", index: true },
        nombreAlumno: { type: String, required: true },
        nombreCurso: { type: String, required: true },
        diaPago: { 
            type: Number, 
            required: true,
            min: 1,
            max: 31,
            description: "Día del mes en que vence el pago"
        },
        montoPago: { type: Number, required: true },
        fechaInicioPago: { 
            type: Date,
            description: "Primer mes desde el cual aplica el pago"
        },
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
