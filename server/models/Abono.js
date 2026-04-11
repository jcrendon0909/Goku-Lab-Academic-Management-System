import mongoose from 'mongoose';

const abonoSchema = new mongoose.Schema({
    abonoId: { type: String, required: true, unique: true },
    nombreAlumno: { type: String, required: true },
    pagoId: { type: String, required: true },
    fechaAbono: { type: String, required: true },
    montoAbono: { type: Number, required: true },
    metodoAbono: { type: String, required: true },
    numeroDeabono: { type: String, required: true },
}, {
    collection: "abonos",
    versionKey: false
});

// Aquí es donde exportas el modelo para que 'pagos.js' pueda usar Abono.find()
export default mongoose.model('Abono', abonoSchema);