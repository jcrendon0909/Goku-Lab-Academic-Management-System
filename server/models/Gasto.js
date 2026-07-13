import mongoose from "mongoose";

const gastoSchema = new mongoose.Schema({
  categoria: { 
    type: String, 
    enum: ['renta', 'luz', 'agua', 'limpieza', 'internet', 'celular', 'insumos', 'adecuaciones', 'regalias', 'publicidad', 'comisiones', 'profesores', 'kommo', 'zadarma'],
    required: true 
  },
  concepto: { type: String, required: true },
  monto: { type: Number, required: true },
  fecha: { type: Date, required: true },
  mes: { 
    type: String, 
    enum: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
    required: true 
  },
  comprobante: { type: String, default: '' }, // URL o nombre de archivo
  notas: { type: String, default: '' },
}, {
  collection: 'gastos',
  timestamps: true
});

export default mongoose.model('Gasto', gastoSchema);