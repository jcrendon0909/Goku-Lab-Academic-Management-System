import mongoose from 'mongoose';

const pagoSchema = new mongoose.Schema({
    monto: {
        pagoId: { type: String, required: true, unique: true },
        nombreAlumno: { type: String, required: true },
        nombreCurso: { type: String, required: true },
        diaPagoFijo: { type: Number, required: true },
        montoPago: { type: Number, required: true },
        }
    });

export default mongoose.model('Pago', pagoSchema, 'pago');