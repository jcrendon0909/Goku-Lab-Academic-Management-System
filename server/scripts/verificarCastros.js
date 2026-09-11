import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Pago from '../models/Pago.js';
import Abono from '../models/Abono.js';

async function conectar() {
  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 30000,
  });
  console.log('✅ Conectado\n');
}

async function verificar() {
  await conectar();

  console.log('═══════════════════════════════════════════════════════');
  console.log('PAGOS Castros (ene–mar 2026)');
  console.log('═══════════════════════════════════════════════════════\n');

  const pagos = await Pago.find({
    idAlumno: { $in: ['ALU078', 'ALU079'] },
    grupoId: { $in: ['GRU025', 'GRU049'] },
    pagoId: { $regex: /-2026-0[123]$/ },
  })
    .sort({ pagoId: 1 })
    .lean();

  for (const p of pagos) {
    console.log(
      `${p.pagoId} | monto: $${p.montoPago} | estatus: ${p.estatus} | tipo: ${p.tipoPago || 'normal'}`
    );
  }

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('ABONOS Castros (ene–mar 2026)');
  console.log('═══════════════════════════════════════════════════════\n');

  const abonos = await Abono.find({
    idAlumno: { $in: ['ALU078', 'ALU079'] },
    pagoId: { $regex: /-2026-0[123]$/ },
  })
    .sort({ pagoId: 1 })
    .lean();

  for (const a of abonos) {
    const fecha = new Date(a.fechaAbono).toISOString().slice(0, 10);
    console.log(`${a.abonoId} | ${fecha} | $${a.montoAbono} | ${a.pagoId}`);
  }

  console.log('\n✅ Verificación completada');
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