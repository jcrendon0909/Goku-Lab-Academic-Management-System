import Counter from './server/models/Counter.js';
import Alumno from './server/models/Alumno.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function syncCounter() {
  try {
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    // Buscar el máximo ID de alumno
    const alumnos = await Alumno.find().lean();
    let maxNum = 0;
    for (const a of alumnos) {
      const match = a.idAlumno ? a.idAlumno.match(/ALU(\d+)/) : null;
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }
    console.log('🔍 Máximo ID encontrado:', maxNum);

    // Actualizar contador
    const result = await Counter.findOneAndUpdate(
      { nombre: 'alumno' },
      { $set: { secuencia: maxNum } },
      { upsert: true, returnDocument: 'after' }
    );
    console.log('✅ Contador de alumnos sincronizado a', result.secuencia);

    await mongoose.disconnect();
    console.log('✅ Desconectado de MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

syncCounter();