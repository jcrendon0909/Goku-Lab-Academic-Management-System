import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Pago from '../models/Pago.js';
import Abono from '../models/Abono.js';
import Alumno from '../models/Alumno.js';

async function conectar() {
  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 30000,
  });
  console.log('✅ Conectado\n');
}

async function verificar() {
  await conectar();

  // 1. Verificar que ALU015 no existe
  const alu015 = await Alumno.findOne({ idAlumno: 'ALU015' });
  const pagos015 = await Pago.countDocuments({ idAlumno: 'ALU015' });
  console.log(`ALU015 eliminado: ${!alu015 ? '✅' : '❌'} | Pagos restantes: ${pagos015}`);

  // 2. Verificar ALU017
  console.log('\n═══ Ramses (ALU017 / GRU020) ═══\n');
  const pagosR = await Pago.find({ idAlumno: 'ALU017', grupoId: 'GRU020' })
    .sort({ fechaInicioPago: 1 })
    .lean();
  for (const p of pagosR) {
    const fecha = new Date(p.fechaInicioPago).toISOString().slice(0, 10);
    console.log(`${p.pagoId} | ${fecha} | $${p.montoPago} | ${p.estatus}`);
  }
  const abonosR = await Abono.find({ idAlumno: 'ALU017', grupoId: 'GRU020' }).sort({ fechaAbono: 1 }).lean();
  console.log(`\nAbonos: ${abonosR.length}`);
  abonosR.forEach((a) => {
    const fecha = new Date(a.fechaAbono).toISOString().slice(0, 10);
    console.log(`  ${a.abonoId} | ${fecha} | $${a.montoAbono} | ${a.pagoId}`);
  });

  // 3. Verificar ALU016
  console.log('\n═══ Axel (ALU016 / GRU039) ═══\n');
  const pagosA = await Pago.find({ idAlumno: 'ALU016', grupoId: 'GRU039' })
    .sort({ fechaInicioPago: 1 })
    .lean();
  for (const p of pagosA) {
    const fecha = new Date(p.fechaInicioPago).toISOString().slice(0, 10);
    console.log(`${p.pagoId} | ${fecha} | $${p.montoPago} | ${p.estatus}`);
  }
  const abonosA = await Abono.find({ idAlumno: 'ALU016', grupoId: 'GRU039' }).sort({ fechaAbono: 1 }).lean();
  console.log(`\nAbonos: ${abonosA.length}`);
  abonosA.forEach((a) => {
    const fecha = new Date(a.fechaAbono).toISOString().slice(0, 10);
    console.log(`  ${a.abonoId} | ${fecha} | $${a.montoAbono} | ${a.pagoId}`);
  });

  console.log('\n✅ Verificación completada');
}

verificar()
  .then(async () => {
    await mongoose.disconnect();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('❌ Error:', err);
    try { await mongoose.disconnect(); } catch (_) {}
    process.exit(1);
  });