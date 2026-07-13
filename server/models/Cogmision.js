import mongoose from "mongoose";

const comisionSchema = new mongoose.Schema({
  vendedor: { type: String, required: true }, // nombre o id del vendedor
  alumnoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Alumno', required: true },
  mesIngreso: { 
    type: String, 
    enum: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
    required: true 
  },
  mesSegundoPago: { 
    type: String, 
    enum: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
    default: null 
  },
  comisionI: { type: Number, required: true, default: 150 },
  comisionII: { type: Number, default: 0 },
  pagadoI: { type: Boolean, default: false },
  pagadoII: { type: Boolean, default: false },
  fechaPagoI: { type: Date, default: null },
  fechaPagoII: { type: Date, default: null },
  observaciones: { type: String, default: '' },
}, {
  collection: 'comisiones',
  timestamps: true
});

export default mongoose.model('Comision', comisionSchema);