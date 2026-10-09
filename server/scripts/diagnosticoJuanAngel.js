import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Abono from '../models/Abono.js';

async function conectar() {
  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 30000,
  });
  console.log('✅ Conectado\n');
}

async function diagnosticar() {
  await conectar();

  const idAlumno = 'ALU054';

  console.log(`═══════════════════════════════════════════════════════`);
  console.log(`ABONOS de ${idAlumno}`);
  console.log(`═══════════════════════════════════════════════════════\n`);

  const abonos = await Abono.find({ idAlumno }).sort({ fechaAbono: 1 }).lean();
  console.log(`Total: ${abonos.length}\n`);

  for (const a of abonos) {
    const fecha = a.fechaAbono
      ? new Date(a.fechaAbono).toISOString().slice(0, 10)
      : '-';
    console.log(
      `${a.abonoId} | ${fecha} | $${a.montoAbono} | ${a.metodoAbono} | pagoId: ${a.pagoId}`
    );
    console.log(`  notas: ${a.notas || '-'}`);
  }

  console.log('\n✅ Diagnóstico completado');
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