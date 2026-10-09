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

async function verificar() {
  await conectar();

  const abonos = await Abono.find({
    idAlumno: 'ALU054',
    pagoId: { $regex: /2026-02/ },
  }).lean();

  console.log(`Abonos de ALU054 en febrero: ${abonos.length}\n`);

  for (const a of abonos) {
    console.log(`_id:      ${a._id}`);
    console.log(`abonoId:  ${a.abonoId || '❌ NO TIENE'}`);
    console.log(`pagoId:   ${a.pagoId}`);
    console.log(`monto:    $${a.montoAbono}`);
    console.log(`fecha:    ${a.fechaAbono ? new Date(a.fechaAbono).toISOString().slice(0, 10) : '-'}`);
    console.log(`createdAt: ${a.createdAt ? new Date(a.createdAt).toISOString() : '-'}`);
    console.log('');
  }

  console.log('✅ Verificación completada');
}

verificar()
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