import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Pago from '../models/Pago.js';
import Abono from '../models/Abono.js';

async function conectar() {
  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 30000,
  });
}

async function verificar() {
  await conectar();
  const idAlumno = 'ALU176';
  const grupoId = 'GRU030';

  console.log('=== PAGOS de Neyra (ALU176 / GRU030) ===\n');
  const pagos = await Pago.find({ idAlumno, grupoId })
    .sort({ fechaInicioPago: 1 })
    .lean();

  for (const p of pagos) {
    const mes = new Date(p.fechaInicioPago).toISOString().slice(0, 7);
    console.log(
      `${mes} | $${p.montoPago} | estatus: ${p.estatus} | tipo: ${p.tipoPago || 'normal'}`
    );
  }

  console.log('\n=== ABONOS de Neyra ===\n');
  const abonos = await Abono.find({ idAlumno, grupoId })
    .sort({ fechaAbono: 1 })
    .lean();

  for (const a of abonos) {
    const fecha = new Date(a.fechaAbono).toISOString().slice(0, 10);
    console.log(`${a.abonoId} | ${fecha} | $${a.montoAbono} | pagoId: ${a.pagoId}`);
  }

  const totalAbonos = abonos.reduce((s, a) => s + (a.montoAbono || 0), 0);
  console.log(`\n💰 Total abonado: $${totalAbonos}`);
  console.log(`(esperado: $1350 si los $1 se corrigieron correctamente)`);
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