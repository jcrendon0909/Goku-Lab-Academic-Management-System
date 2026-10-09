import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Pago from '../models/Pago.js';

async function conectar() {
  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 30000,
  });
  console.log('✅ Conectado\n');
}

async function diagnosticar() {
  await conectar();

  const idAlumno = 'ALU054';
  const grupos = ['GRU039', 'GRU047', 'GRU056'];

  for (const grupoId of grupos) {
    console.log('═══════════════════════════════════════════════════════');
    console.log(`${idAlumno} / ${grupoId}`);
    console.log('═══════════════════════════════════════════════════════\n');

    const pagos = await Pago.find({ idAlumno, grupoId })
      .sort({ fechaInicioPago: 1 })
      .lean();

    console.log(`Total pagos: ${pagos.length}\n`);
    for (const p of pagos) {
      const fecha = p.fechaInicioPago
        ? new Date(p.fechaInicioPago).toISOString().slice(0, 10)
        : '-';
      console.log(
        `  ${p.pagoId} | ${fecha} | $${p.montoPago} | ${p.estatus} | activo: ${p.activo}`
      );
    }
    console.log('');
  }

  console.log('✅ Diagnóstico completado');
}

diagnosticar()
  .then(async () => {
    await mongoose.disconnect();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('❌ Error:', err);
    try {
      await mongoose.disconnect();
    } catch (_) {}
    process.exit(1);
  });